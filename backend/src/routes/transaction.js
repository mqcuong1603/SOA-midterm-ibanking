import express from "express";
import Student from "../models/Student.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import Transaction from "../models/Transaction.js";
import TransactionHistory from "../models/TransactionHistory.js";
import TransactionLock from "../models/TransactionLock.js";
import sequelize from "../config/database.js";
import { Op } from "sequelize";
import OtpCode from "../models/OtpCode.js";
import { sendOTPEmail } from "../services/emailService.js";

const router = express.Router();
router.use(authMiddleware);

// OTP utility functions
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const createOTP = async (transactionId) => {
  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await OtpCode.create({
    transaction_id: transactionId,
    otp_code: otpCode,
    expires_at: expiresAt,
    is_used: false,
  });
  return otpCode;
};

// Initialize transaction
router.post("/initialize", async (req, res) => {
  try {
    const { student_id } = req.body;
    const payer_id = req.user.userId;

    if (!student_id)
      return res.status(400).json({ error: "Student ID is required" });

    const student = await Student.findOne({ where: { student_id } });
    if (!student) return res.status(404).json({ error: "Student not found" });
    if (student.is_paid)
      return res.status(400).json({ error: "Student tuition already paid" });

    // Check locks
    const [existingUserLock, existingStudentLock] = await Promise.all([
      TransactionLock.findOne({
        where: {
          resource_type: "user_account",
          resource_id: payer_id.toString(),
          expires_at: { [Op.gt]: new Date() },
        },
      }),
      TransactionLock.findOne({
        where: {
          resource_type: "student_tuition",
          resource_id: student_id,
          expires_at: { [Op.gt]: new Date() },
        },
      }),
    ]);
    if (existingUserLock)
      return res.status(409).json({
        error:
          "You already have a pending transaction. Please complete or wait for expiration",
      });
    if (existingStudentLock)
      return res.status(409).json({
        error:
          "This student's payment is already being processed by another user.",
      });

    // Create locks
    const lockExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await TransactionLock.bulkCreate([
      {
        resource_type: "user_account",
        resource_id: payer_id.toString(),
        expires_at: lockExpiry,
      },
      {
        resource_type: "student_tuition",
        resource_id: student_id,
        expires_at: lockExpiry,
      },
    ]);

    // Create transaction
    const transaction = await Transaction.create({
      payer_id,
      student_id,
      amount: student.tuition_amount,
      status: "pending",
    });

    // Send OTP
    const otpCode = await createOTP(transaction.id);
    const user = await User.findByPk(payer_id);
    await sendOTPEmail(user.email, otpCode, student);
    console.log(`Generated OTP ${otpCode} for transaction ${transaction.id}`);

    await transaction.update({ status: "otp_sent" });

    res.json({
      message: "Transaction created successfully. OTP sent to your email.",
      transaction: {
        id: transaction.id,
        student_id: transaction.student_id,
        amount: transaction.amount,
        status: "otp_sent",
      },
    });
  } catch (error) {
    console.error("Initialize transaction error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Resend OTP
router.post("/send_otp", async (req, res) => {
  try {
    const { transaction_id } = req.body;
    const payer_id = req.user.userId;
    if (!transaction_id)
      return res.status(400).json({ error: "Transaction ID is required" });

    const transaction = await Transaction.findOne({
      where: {
        id: transaction_id,
        payer_id,
        status: ["pending", "otp_sent"],
      },
    });
    if (!transaction)
      return res
        .status(404)
        .json({ error: "Transaction not found or already completed" });

    // Prevent spamming OTP
    const lastOtp = await OtpCode.findOne({
      where: { transaction_id },
      order: [["createdAt", "DESC"]],
    });
    if (lastOtp) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (lastOtp.createdAt > oneMinuteAgo) {
        const remainingSeconds = Math.ceil(
          (lastOtp.createdAt.getTime() + 60000 - Date.now()) / 1000
        );
        return res.status(429).json({
          error: `Please wait ${remainingSeconds} seconds before requesting new OTP`,
        });
      }
    }

    await OtpCode.update(
      { is_used: true },
      { where: { transaction_id, is_used: false } }
    );
    const newOtpCode = await createOTP(transaction_id);
    const user = await User.findByPk(transaction.payer_id);
    const student = await Student.findOne({
      where: { student_id: transaction.student_id },
    });
    await sendOTPEmail(user.email, newOtpCode, student);

    console.log(
      `Generated new OTP ${newOtpCode} for transaction ${transaction_id}`
    );
    await transaction.update({ status: "otp_sent" });

    res.json({ message: "OTP resent successfully. Check your email." });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Complete transaction
router.post("/complete", async (req, res) => {
  const dbTransaction = await sequelize.transaction();
  try {
    const { otp_code, transaction_id } = req.body;
    const payer_id = req.user.userId;
    if (!otp_code || !transaction_id)
      return res
        .status(400)
        .json({ error: "OTP code and transaction ID are required" });

    const transaction = await Transaction.findOne({
      where: { id: transaction_id, payer_id, status: "otp_sent" },
    });
    if (!transaction)
      return res
        .status(404)
        .json({ error: "Transaction not found or not ready for completion" });

    // OTP VERIFICATION
    const otpRecord = await OtpCode.findOne({
      where: { transaction_id, otp_code, is_used: false },
    });

    // Case 1: No OTP found (wrong code)
    if (!otpRecord) {
      // Increment failed attempts counter
      await transaction.increment("failed_otp_attempts", {
        transaction: dbTransaction,
      });
      const currentFailures = transaction.failed_otp_attempts + 1;

      // Check if too many failed attempts (3 attempts max)
      if (currentFailures >= 3) {
        // Lock transaction
        await transaction.update(
          {
            status: "failed",
            completed_at: new Date(),
          },
          { transaction: dbTransaction }
        );

        // Release resource locks
        await TransactionLock.destroy(
          {
            where: {
              [Op.or]: [
                {
                  resource_type: "user_account",
                  resource_id: payer_id.toString(),
                },
                {
                  resource_type: "student_tuition",
                  resource_id: transaction.student_id,
                },
              ],
            },
          },
          { transaction: dbTransaction }
        );

        await dbTransaction.commit();
        return res.status(423).json({
          error:
            "Transaction locked due to multiple failed OTP attempts. Please start a new payment.",
          error_code: "TOO_MANY_ATTEMPTS",
          failed_attempts: currentFailures,
          transaction_status: "failed",
        });
      }

      // Still have attempts left
      await dbTransaction.commit();
      return res.status(400).json({
        error: "Invalid OTP code",
        error_code: "INVALID_OTP",
        failed_attempts: currentFailures,
        remaining_attempts: 3 - currentFailures,
      });
    }

    // Case 2: Correct OTP but expired
    if (otpRecord.expires_at < new Date()) {
      await transaction.update(
        { status: "failed", completed_at: new Date() },
        { transaction: dbTransaction }
      );

      // Release resource locks
      await TransactionLock.destroy(
        {
          where: {
            [Op.or]: [
              {
                resource_type: "user_account",
                resource_id: payer_id.toString(),
              },
              {
                resource_type: "student_tuition",
                resource_id: transaction.student_id,
              },
            ],
          },
        },
        { transaction: dbTransaction }
      );

      await dbTransaction.commit();
      return res.status(400).json({
        error: "OTP has expired. Transaction has been cancelled.",
        error_code: "OTP_EXPIRED",
        transaction_status: "failed",
      });
    }

    // Case 3: Valid OTP - mark as used and continue
    await otpRecord.update({ is_used: true }, { transaction: dbTransaction });

    // Check payer and balance
    const payer = await User.findByPk(payer_id);
    if (!payer) {
      await dbTransaction.rollback();
      return res.status(404).json({ error: "Payer not found" });
    }
    if (parseFloat(payer.balance) < parseFloat(transaction.amount)) {
      await dbTransaction.rollback();
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const newBalance =
      parseFloat(payer.balance) - parseFloat(transaction.amount);

    // Atomic updates
    await User.update(
      { balance: newBalance.toString() },
      { where: { id: payer_id }, transaction: dbTransaction }
    );
    await Student.update(
      { is_paid: true },
      {
        where: { student_id: transaction.student_id },
        transaction: dbTransaction,
      }
    );
    await Transaction.update(
      { status: "completed", completed_at: new Date() },
      { where: { id: transaction_id }, transaction: dbTransaction }
    );
    await TransactionHistory.create(
      {
        user_id: payer_id,
        transaction_id,
        balance_before: parseFloat(payer.balance),
        balance_after: newBalance,
      },
      { transaction: dbTransaction }
    );
    await TransactionLock.destroy({
      where: {
        [Op.or]: [
          { resource_type: "user_account", resource_id: payer_id.toString() },
          {
            resource_type: "student_tuition",
            resource_id: transaction.student_id,
          },
        ],
      },
      transaction: dbTransaction,
    });

    await dbTransaction.commit();

    res.json({
      message: "Transaction completed successfully!",
      transaction: {
        id: transaction.id,
        student_id: transaction.student_id,
        amount: transaction.amount,
        status: "completed",
      },
      new_balance: newBalance.toString(),
    });
  } catch (error) {
    await dbTransaction.rollback();
    console.error("Complete transaction error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
