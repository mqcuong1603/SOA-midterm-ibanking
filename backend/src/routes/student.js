import express from "express";
import Student from "../models/Student.js";

const router = express.Router();

router.get("/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;

    //find student
    const student = await Student.findOne({
      where: { student_id: student_id },
    });

    if (!student) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    if (student.is_paid) {
      res.json({
        message: "Retrieve student information successfully",
        student: {
          student_id: student.student_id,
          full_name: student.full_name,
          is_paid: student.is_paid,
        },
      });
    } else {
      res.json({
        message: "Retrieve student information successfully",
        student: {
          student_id: student.student_id,
          full_name: student.full_name,
          tuition_amount: student.tuition_amount,
          is_paid: student.is_paid,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
