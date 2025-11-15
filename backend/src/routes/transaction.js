import express from "express";
import Student from "../models/Student.js";
import StudentTuition from "../models/StudentTuition.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import Transaction from "../models/Transaction.js";
import TransactionHistory from "../models/TransactionHistory.js";
import TransactionLock from "../models/TransactionLock.js";
import sequelize from "../config/database.js";
import { Op } from "sequelize";
import OtpCode from "../models/OtpCode.js";
import {
  sendOTPEmail,
  sendPaymentConfirmationEmail,
} from "../services/emailService.js";

const router = express.Router();
router.use(authMiddleware);

// Get available semesters for a student
router.get("/semesters/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;
    const { show_all } = req.query; // Optional: show all semesters or only unpaid

    if (!student_id)
      return res.status(400).json({ error: "Student ID is required" });

    // Verify student exists
    const student = await Student.findOne({ where: { student_id } });
    if (!student) return res.status(404).json({ error: "Student not found" });

    // Build query conditions
    const whereClause = { student_id };
    if (show_all !== "true") {
      whereClause.is_paid = false; // Only show unpaid by default
    }

    // Get all semesters for this student
    const semesters = await StudentTuition.findAll({
      where: whereClause,
      order: [
        ["academic_year", "DESC"],
        ["semester", "ASC"],
      ],
    });

    res.json({
      student: {
        student_id: student.student_id,
        full_name: student.full_name,
        major: student.major,
      },
      semesters: semesters.map((sem) => ({
        id: sem.id,
        semester: sem.semester,
        academic_year: sem.academic_year,
        tuition_amount: sem.tuition_amount,
        is_paid: sem.is_paid,
        paid_at: sem.paid_at,
      })),
      total_unpaid: semesters
        .filter((s) => !s.is_paid)
        .reduce((sum, s) => sum + parseFloat(s.tuition_amount), 0),
    });
  } catch (error) {
    console.error("Get semesters error:", error);
    res.status(500).json({ error: error.message });
  }
});

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
  const dbTransaction = await sequelize.transaction();
  try {
    const { student_id, tuition_id } = req.body;
    const payer_id = req.user.userId;

    if (!student_id || !tuition_id) {
      await dbTransaction.rollback();
      return res
        .status(400)
        .json({ error: "Student ID and Tuition ID are required" });
    }

    // Fetch student and semester tuition info
    const student = await Student.findOne({ where: { student_id } });
    if (!student) {
      await dbTransaction.rollback();
      return res.status(404).json({ error: "Student not found" });
    }

    const tuition = await StudentTuition.findOne({
      where: { id: tuition_id, student_id },
    });
    if (!tuition) {
      await dbTransaction.rollback();
      return res
        .status(404)
        .json({ error: "Tuition record not found for this student" });
    }
    if (tuition.is_paid) {
      await dbTransaction.rollback();
      return res
        .status(400)
        .json({ error: "This semester tuition is already paid" });
    }

    // Check locks
    const [existingUserLock, existingSemesterLock] = await Promise.all([
      TransactionLock.findOne({
        where: {
          resource_type: "user_account",
          resource_id: payer_id.toString(),
          expires_at: { [Op.gt]: new Date() },
        },
        transaction: dbTransaction,
      }),
      TransactionLock.findOne({
        where: {
          resource_type: "semester_tuition",
          resource_id: tuition_id.toString(),
          expires_at: { [Op.gt]: new Date() },
        },
        transaction: dbTransaction,
      }),
    ]);
    if (existingUserLock) {
      await dbTransaction.rollback();
      return res.status(409).json({
        error:
          "You already have a pending transaction. Please complete or wait for expiration",
      });
    }
    if (existingSemesterLock) {
      await dbTransaction.rollback();
      return res.status(409).json({
        error:
          "This semester tuition payment is already being processed by another user.",
      });
    }

    // Create locks with unique constraint protection
    const lockExpiry = new Date(Date.now() + 5 * 60 * 1000);
    try {
      await TransactionLock.bulkCreate(
        [
          {
            resource_type: "user_account",
            resource_id: payer_id.toString(),
            expires_at: lockExpiry,
          },
          {
            resource_type: "semester_tuition",
            resource_id: tuition_id.toString(),
            expires_at: lockExpiry,
          },
        ],
        { transaction: dbTransaction }
      );
    } catch (lockError) {
      await dbTransaction.rollback();
      // Handle race condition - another request created lock between check and create
      if (lockError.name === "SequelizeUniqueConstraintError") {
        // Determine which lock failed
        const errorFields = lockError.fields || {};
        if (errorFields.resource_type === "user_account") {
          return res.status(409).json({
            error:
              "You already have a pending transaction. Please complete or wait for expiration",
          });
        } else {
          return res.status(409).json({
            error:
              "This semester tuition payment is already being processed by another user.",
          });
        }
      }
      throw lockError; // Re-throw if not a unique constraint error
    }

    // Create transaction
    const transaction = await Transaction.create(
      {
        payer_id,
        student_id,
        tuition_id,
        amount: tuition.tuition_amount,
        status: "pending",
      },
      { transaction: dbTransaction }
    );

    // Commit the database transaction BEFORE sending email (email is slow I/O)
    await dbTransaction.commit();

    // Now send OTP via email (outside of database transaction to avoid blocking)
    try {
      const otpCode = await createOTP(transaction.id);
      const user = await User.findByPk(payer_id);
      const emailData = {
        student_id: student.student_id,
        full_name: student.full_name,
        semester: tuition.semester,
        academic_year: tuition.academic_year,
        tuition_amount: tuition.tuition_amount,
      };
      await sendOTPEmail(user.email, otpCode, emailData);
      console.log(`Generated OTP ${otpCode} for transaction ${transaction.id}`);

      // Update status to otp_sent
      await transaction.update({ status: "otp_sent" });

      res.json({
        message: "Transaction created successfully. OTP sent to your email.",
        transaction: {
          id: transaction.id,
          student_id: transaction.student_id,
          tuition_id: transaction.tuition_id,
          semester: tuition.semester,
          academic_year: tuition.academic_year,
          amount: transaction.amount,
          status: "otp_sent",
        },
      });
    } catch (emailError) {
      // Email failed but transaction and locks are already created
      // Log error but still return success with pending status
      console.error("Failed to send OTP email:", emailError);
      res.json({
        message: "Transaction created. Please use resend OTP if you don't receive the email.",
        transaction: {
          id: transaction.id,
          student_id: transaction.student_id,
          tuition_id: transaction.tuition_id,
          semester: tuition.semester,
          academic_year: tuition.academic_year,
          amount: transaction.amount,
          status: "pending",
        },
        warning: "OTP email could not be sent. Please use resend OTP button.",
      });
    }
  } catch (error) {
    // Only rollback if we haven't committed yet
    if (!dbTransaction.finished) {
      await dbTransaction.rollback();
    }
    console.error("Initialize transaction error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's pending/incomplete transactions
router.get("/pending", async (req, res) => {
  try {
    const payer_id = req.user.userId;

    // Find all pending or otp_sent transactions for the user
    const pendingTransactions = await Transaction.findAll({
      where: {
        payer_id,
        status: ["pending", "otp_sent"],
      },
      order: [["createdAt", "DESC"]],
    });

    // Enrich with student and tuition information
    const enrichedTransactions = await Promise.all(
      pendingTransactions.map(async (transaction) => {
        const student = await Student.findOne({
          where: { student_id: transaction.student_id },
        });
        const tuition = await StudentTuition.findByPk(transaction.tuition_id);

        // Check if transaction has expired (created more than 1 hour ago)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const isExpired = transaction.createdAt < oneHourAgo;

        return {
          id: transaction.id,
          student_id: transaction.student_id,
          student_name: student ? student.full_name : "Unknown",
          semester: tuition ? tuition.semester : null,
          academic_year: tuition ? tuition.academic_year : null,
          amount: transaction.amount,
          status: transaction.status,
          created_at: transaction.createdAt,
          is_expired: isExpired,
          failed_otp_attempts: transaction.failed_otp_attempts,
        };
      })
    );

    res.json({
      pending_transactions: enrichedTransactions,
      count: enrichedTransactions.length,
    });
  } catch (error) {
    console.error("Get pending transactions error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all transaction history (completed, failed, pending)
router.get("/history", async (req, res) => {
  try {
    const payer_id = req.user.userId;
    const { status } = req.query; // Optional filter by status

    const whereClause = { payer_id };
    if (status && ["pending", "otp_sent", "completed", "failed"].includes(status)) {
      whereClause.status = status;
    }

    const transactions = await Transaction.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    // Enrich with student and tuition information
    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const student = await Student.findOne({
          where: { student_id: transaction.student_id },
        });
        const tuition = await StudentTuition.findByPk(transaction.tuition_id);

        return {
          id: transaction.id,
          student_id: transaction.student_id,
          student_name: student ? student.full_name : "Unknown",
          semester: tuition ? tuition.semester : null,
          academic_year: tuition ? tuition.academic_year : null,
          amount: transaction.amount,
          status: transaction.status,
          created_at: transaction.createdAt,
          completed_at: transaction.completed_at,
          failed_otp_attempts: transaction.failed_otp_attempts,
        };
      })
    );

    res.json({
      transactions: enrichedTransactions,
      count: enrichedTransactions.length,
    });
  } catch (error) {
    console.error("Get transaction history error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel a pending transaction
router.post("/cancel", async (req, res) => {
  const dbTransaction = await sequelize.transaction();
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
      return res.status(404).json({
        error: "Transaction not found or already completed/cancelled",
      });

    // Mark transaction as failed
    await transaction.update(
      {
        status: "failed",
        completed_at: new Date(),
      },
      { transaction: dbTransaction }
    );

    // Release resource locks
    await TransactionLock.destroy({
      where: {
        [Op.or]: [
          { resource_type: "user_account", resource_id: payer_id.toString() },
          {
            resource_type: "semester_tuition",
            resource_id: transaction.tuition_id.toString(),
          },
        ],
      },
      transaction: dbTransaction,
    });

    // Mark unused OTPs as used
    await OtpCode.update(
      { is_used: true },
      {
        where: { transaction_id, is_used: false },
        transaction: dbTransaction,
      }
    );

    await dbTransaction.commit();

    res.json({
      message: "Transaction cancelled successfully",
      transaction_id: transaction.id,
      status: "failed",
    });
  } catch (error) {
    await dbTransaction.rollback();
    console.error("Cancel transaction error:", error);
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
    const tuition = await StudentTuition.findByPk(transaction.tuition_id);
    const emailData = {
      student_id: student.student_id,
      full_name: student.full_name,
      semester: tuition.semester,
      academic_year: tuition.academic_year,
      tuition_amount: tuition.tuition_amount,
    };
    await sendOTPEmail(user.email, newOtpCode, emailData);

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
                  resource_type: "semester_tuition",
                  resource_id: transaction.tuition_id.toString(),
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
                resource_type: "semester_tuition",
                resource_id: transaction.tuition_id.toString(),
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
      // Mark transaction as failed due to insufficient balance
      await transaction.update(
        {
          status: "failed",
          completed_at: new Date(),
        },
        { transaction: dbTransaction }
      );

      // Release resource locks
      await TransactionLock.destroy({
        where: {
          [Op.or]: [
            { resource_type: "user_account", resource_id: payer_id.toString() },
            {
              resource_type: "semester_tuition",
              resource_id: transaction.tuition_id.toString(),
            },
          ],
        },
        transaction: dbTransaction,
      });

      await dbTransaction.commit();
      return res.status(400).json({
        error: "Insufficient balance. Transaction has been cancelled.",
        error_code: "INSUFFICIENT_BALANCE",
        transaction_status: "failed",
        current_balance: payer.balance,
        required_amount: transaction.amount,
      });
    }

    const newBalance =
      parseFloat(payer.balance) - parseFloat(transaction.amount);

    // Atomic updates
    await User.update(
      { balance: newBalance.toString() },
      { where: { id: payer_id }, transaction: dbTransaction }
    );
    await StudentTuition.update(
      { is_paid: true, paid_at: new Date() },
      {
        where: { id: transaction.tuition_id },
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
            resource_type: "semester_tuition",
            resource_id: transaction.tuition_id.toString(),
          },
        ],
      },
      transaction: dbTransaction,
    });

    await dbTransaction.commit();

    // Get student and tuition information for confirmation email
    const student = await Student.findOne({
      where: { student_id: transaction.student_id },
    });
    const tuition = await StudentTuition.findByPk(transaction.tuition_id);

    // Send payment confirmation email
    try {
      const paymentData = {
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
        },
        student: {
          student_id: student.student_id,
          full_name: student.full_name,
        },
        semester: {
          semester: tuition.semester,
          academic_year: tuition.academic_year,
        },
        payer: {
          full_name: payer.full_name,
          balance: payer.balance,
        },
        newBalance: newBalance.toString(),
      };

      const emailResult = await sendPaymentConfirmationEmail(
        payer.email,
        paymentData
      );
      if (emailResult.success) {
        console.log(`✅ Confirmation email sent to ${payer.email}`);
      } else {
        console.error(
          `❌ Failed to send confirmation email: ${emailResult.error}`
        );
      }
    } catch (emailError) {
      console.error("❌ Error sending confirmation email:", emailError.message);
      // Don't fail the transaction if email fails
    }

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
