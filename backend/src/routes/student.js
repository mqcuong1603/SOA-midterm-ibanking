import express from "express";
import Student from "../models/Student.js";
import StudentTuition from "../models/StudentTuition.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;

    // Find student
    const student = await Student.findOne({
      where: { student_id: student_id },
    });

    if (!student) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    // Get all semester tuition records for this student
    const semesters = await StudentTuition.findAll({
      where: { student_id: student_id },
      order: [
        ["academic_year", "DESC"],
        ["semester", "ASC"],
      ],
    });

    // Calculate unpaid semesters
    const unpaidSemesters = semesters.filter((s) => !s.is_paid);
    const totalUnpaid = unpaidSemesters.reduce(
      (sum, s) => sum + parseFloat(s.tuition_amount),
      0
    );

    res.json({
      message: "Retrieve student information successfully",
      student: {
        student_id: student.student_id,
        full_name: student.full_name,
        major: student.major,
        enrollment_year: student.enrollment_year,
      },
      tuition_summary: {
        total_semesters: semesters.length,
        unpaid_semesters: unpaidSemesters.length,
        total_unpaid_amount: totalUnpaid,
      },
      semesters: semesters.map((sem) => ({
        id: sem.id,
        semester: sem.semester,
        academic_year: sem.academic_year,
        tuition_amount: sem.tuition_amount,
        is_paid: sem.is_paid,
        paid_at: sem.paid_at,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
