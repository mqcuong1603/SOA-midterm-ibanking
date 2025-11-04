import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/profile", async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User profile retrieved successfully",
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

import Transaction from "../models/Transaction.js";
import TransactionHistory from "../models/TransactionHistory.js";
import Student from "../models/Student.js";
import StudentTuition from "../models/StudentTuition.js";

router.get("/transactions", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all completed transactions for this user with related data
    const transactions = await Transaction.findAll({
      where: {
        payer_id: userId,
        status: "completed",
      },
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["student_id", "full_name", "major"],
        },
        {
          model: StudentTuition,
          as: "tuition",
          attributes: ["semester", "academic_year", "tuition_amount"],
        },
      ],
      attributes: ["id", "amount", "status", "completed_at", "created_at"],
      order: [["completed_at", "DESC"]],
    });

    // Get transaction history (balance changes)
    const history = await TransactionHistory.findAll({
      where: { user_id: userId },
      attributes: [
        "id",
        "transaction_id",
        "balance_before",
        "balance_after",
        "created_at",
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({
      message: "Transaction history retrieved successfully",
      transactions: transactions,
      history: history,
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
