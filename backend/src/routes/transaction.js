import express from "express";
import Student from "../models/Student.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import Transaction from "../models/Transaction.js";
import sequelize from "../config/database.js";

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

    // Create transaction
    const transaction = await Transaction.create({
      payer_id: payer_id,
      student_id: student_id,
      amount: student.tuition_amount,
      status: "pending",
    });

    // Mock OTP sending
    console.log(
      `Sending OTP to user ${payer_id} for transaction ${transaction.id}`
    );
    const otpCode = "123456";

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
