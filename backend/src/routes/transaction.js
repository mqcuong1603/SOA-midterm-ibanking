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
    //get info
    const { student_id } = req.body;
    const payer_id = req.user.userId;

    const student = await Student.findOne({
      where: { student_id: student_id },
    });

    //check
    if (!student) {
      return res.status(401).json({ error: "Student not found" });
    }

    if (student.is_paid) {
      return res.status(400).json({ error: "Student tuition already paid" });
    }

    //create transaction
    const transaction = await Transaction.create({
      payer_id: payer_id,
      student_id: student_id,
      amount: student.tuition_amount,
      status: "pending",
    });

    //response
    res.json({
      message: "Transaction initialized successfully",
      transaction: {
        id: transaction.id,
        student_id: transaction.student_id,
        amount: transaction.amount,
        status: transaction.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/complete", async (req, res) => {
  try {
    //get info
    const { otp_code, transaction_id } = req.body;
    const payer_id = req.user.userId;

    const transaction = await Transaction.findOne({
      where: {
        id: transaction_id,
        payer_id: payer_id,
        status: "pending",
      },
    });

    //check
    if (!transaction) {
      return res
        .status(404)
        .json({ error: "Transaction not found or already completed" });
    }

    if (otp_code != "123456") {
      return res.status(400).json({ error: "Invalid otp_code" });
    }

    const payer = await User.findByPk(payer_id);

    if (payer.balance < transaction.amount) {
      return res.status(400).json({ error: "Insufficent Balance" });
    }

    //start db processing
    const newBalance = payer.balance - transaction.amount;
    const dbTransaction = await sequelize.transaction();

    try {
      await User.update(
        { balance: newBalance },
        { where: { id: payer_id }, transaction: dbTransaction }
      );
      await Student.update(
        { is_paid: true },
        {
          where: {
            student_id: transaction.student_id,
          },
          transaction: dbTransaction,
        }
      );
      await Transaction.update(
        { status: "completed", completed_at: new Date() },
        { where: { id: transaction_id }, transaction: dbTransaction }
      );
    } catch (error) {
      await dbTransaction.rollback();
    }

    await dbTransaction.commit();

    res.json({
      message: "Complete transaction!",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
