import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Student from "../models/Student.js";

const router = express.Router();

router.post("/seed", async (req, res) => {
  try {
    // Create test user
    const hashedPassword = await bcrypt.hash("123456", 10);

    await User.create({
      username: "testuser",
      password: hashedPassword,
      full_name: "Nguyen Van A",
      email: "test@example.com",
      phone: "0901234567",
      balance: 50000000,
    });

    // Create test students
    await Student.bulkCreate([
      {
        student_id: "2021001234",
        full_name: "Tran Van B",
        tuition_amount: 20000000,
        is_paid: false,
      },
      {
        student_id: "2021005678",
        full_name: "Le Thi C",
        tuition_amount: 15000000,
        is_paid: false,
      },
    ]);

    res.json({ message: "Test data created successfully!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
