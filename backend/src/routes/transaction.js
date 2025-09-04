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

// OTP utility functions
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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

const router = express.Router();

router.use(authMiddleware);

router.post("/initialize", async (req, res) => {
  try {
    const { student_id } = req.body;
    const payer_id = req.user.userId;

    // Validate input
    if (!student_id) {
      return res.status(400).json({ error: "Student ID is required" });
    }

    const student = await Student.findOne({
      where: { student_id: student_id },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.is_paid) {
      return res.status(400).json({ error: "Student tuition already paid" });
    }

    //check uer lock
    const existingUserLock = await TransactionLock.findOne({
      where: {
        resource_type: "user_account",
        resource_id: payer_id.toString(),
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (existingUserLock) {
      return res.status(409).json({
        error:
          "You already have a pending transaction. Please complete or wait for expiration",
      });
    }

    //check student lock
    const existingStudentLock = await TransactionLock.findOne({
      where: {
        resource_type: "student_tuition",
        resource_id: student_id,
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (existingStudentLock) {
      return res.status(409).json({
        error:
          "This student's payment is already being processed by another user.",
      });
    }

    //create both locks
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
      payer_id: payer_id,
      student_id: student_id,
      amount: student.tuition_amount,
      status: "pending",
    });

    // Mock OTP sending
    const otpCode = await createOTP(transaction.id);
    console.log(`Generated OTP ${otpCode} for transaction ${transaction.id}`);
    // TODO: Send email with otpCode to user

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

router.post("/send_otp", async (req, res) => {
  try {
    const { transaction_id } = req.body;
    const payer_id = req.user.userId;

    // Validate input
    if (!transaction_id) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    const transaction = await Transaction.findOne({
      where: {
        id: transaction_id,
        payer_id: payer_id,
        status: ["pending", "otp_sent"],
      },
    });

    if (!transaction) {
      return res.status(404).json({
        error: "Transaction not found or already completed",
      });
    }

    console.log(
      `Resending OTP to user ${payer_id} for transaction ${transaction_id}`
    );

    // Update transaction status to otp_sent
    await transaction.update({ status: "otp_sent" });

    res.json({
      message: "OTP resent successfully. Check your email.",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/complete", async (req, res) => {
  const dbTransaction = await sequelize.transaction();

  try {
    const { otp_code, transaction_id } = req.body;
    const payer_id = req.user.userId;

    // Validate input
    if (!otp_code || !transaction_id) {
      return res
        .status(400)
        .json({ error: "OTP code and transaction ID are required" });
    }

    const transaction = await Transaction.findOne({
      where: {
        id: transaction_id,
        payer_id: payer_id,
        status: "otp_sent",
      },
    });

    if (!transaction) {
      return res.status(404).json({
        error: "Transaction not found or not ready for completion",
      });
    }

    // Verify OTP
    if (otp_code !== "123456") {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    // Get payer and verify balance
    const payer = await User.findByPk(payer_id);
    if (!payer) {
      return res.status(404).json({ error: "Payer not found" });
    }

    if (parseFloat(payer.balance) < parseFloat(transaction.amount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Calculate new balance
    const newBalance =
      parseFloat(payer.balance) - parseFloat(transaction.amount);

    // Perform all database operations in transaction
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
      {
        status: "completed",
        completed_at: new Date(),
      },
      { where: { id: transaction_id }, transaction: dbTransaction }
    );

    await TransactionHistory.create(
      {
        user_id: payer_id,
        transaction_id: transaction_id,
        balance_before: parseFloat(payer.balance),
        balance_after: newBalance,
      },
      { transaction: dbTransaction }
    );

    await TransactionLock.destroy({
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
