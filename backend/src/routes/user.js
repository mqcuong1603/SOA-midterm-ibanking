import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import TransactionHistory from "../models/TransactionHistory.js";
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

router.get("/transactions", async (req, res) => {
  try {
    const userId = req.user.userId;

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
      history: history,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
