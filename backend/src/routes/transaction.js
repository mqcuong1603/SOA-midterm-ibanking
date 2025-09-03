import express from "express";
import Student from "../models/Student.js";
import authMiddleware from "../middleware/auth.js";
import Transaction from "../models/Transaction.js";
import { decode } from "jsonwebtoken";

const router = express.Router();

router.use(authMiddleware);

router.post("/initialize", async (req, res) => {
  try {
    const { student_id } = req.body;
    const payer_id = req.user.userId;

    const student = await Student.findOne({
      where: { student_id: student_id },
    });

    if (!student) {
      return res.status(401).json({ error: "Student not found" });
    }

    if (student.is_paid) {
      return res.status(400).json({ error: "Student tuition already paid" });
    }

    const transaction = await Transaction.create({
      payer_id: payer_id,
      student_id: student_id,
      amount: student.tuition_amount,
      status: "pending",
    });

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

export default router;
