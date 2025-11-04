import bcrypt from "bcrypt";
import User from "../models/User.js";
import Student from "../models/Student.js";
import StudentTuition from "../models/StudentTuition.js";
import sequelize from "./database.js";

export const initializeDatabase = async () => {
  try {
    console.log("🔄 Initializing database...");

    // Sync all models - creates tables if they don't exist
    await sequelize.sync({ alter: false, force: false });
    console.log("✅ Database tables synchronized");

    // Check if we need to seed data
    const userCount = await User.count();

    if (userCount === 0) {
      console.log("📦 No data found, seeding test data...");
      await seedTestData();
    } else {
      console.log("✅ Database already has data, skipping seed");
      console.log(
        "👤 Available Users: cuongcfvipss5, mqcuong1603, testuser (password: 123456)"
      );
      console.log("🎓 Test Students: 522i0001, 522i0002, 522i0003");
    }

    console.log("🎉 Database initialization complete!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    // Don't throw - let server continue even if sync fails
    console.log("⚠️  Continuing despite error...");
  }
};

const seedTestData = async () => {
  try {
    const hashedPassword = await bcrypt.hash("123456", 10);

    await User.bulkCreate([
      {
        username: "cuongcfvipss5",
        password: hashedPassword,
        full_name: "Cuong Ma CFV",
        email: "cuongcfvipss5@gmail.com",
        phone: "0901234567",
        balance: 50000000,
      },
      {
        username: "mqcuong1603",
        password: hashedPassword,
        full_name: "Ma Quoc Cuong",
        email: "mqcuong1603@gmail.com",
        phone: "0901234568",
        balance: 50000000,
      },
      {
        username: "testuser",
        password: hashedPassword,
        full_name: "Test User",
        email: "testuser@example.com",
        phone: "0909999999",
        balance: 100000000,
      },
    ]);

    // Create test students
    await Student.bulkCreate([
      {
        student_id: "522i0001",
        full_name: "Tran Van B",
        major: "Computer Science",
        enrollment_year: 2022,
      },
      {
        student_id: "522i0002",
        full_name: "Le Thi C",
        major: "Information Technology",
        enrollment_year: 2022,
      },
      {
        student_id: "522i0003",
        full_name: "Pham Minh D",
        major: "Software Engineering",
        enrollment_year: 2022,
      },
    ]);

    // Create semester tuition records
    await StudentTuition.bulkCreate([
      // Student 522i0001 - 3 unpaid semesters
      {
        student_id: "522i0001",
        semester: "2024-1",
        academic_year: "2024-2025",
        tuition_amount: 20000000,
        is_paid: false,
      },
      {
        student_id: "522i0001",
        semester: "2024-2",
        academic_year: "2024-2025",
        tuition_amount: 20000000,
        is_paid: false,
      },
      {
        student_id: "522i0001",
        semester: "2025-1",
        academic_year: "2024-2025",
        tuition_amount: 20000000,
        is_paid: false,
      },
      // Student 522i0002 - 2 semesters (one paid, one unpaid)
      {
        student_id: "522i0002",
        semester: "2024-1",
        academic_year: "2024-2025",
        tuition_amount: 15000000,
        is_paid: true,
        paid_at: new Date("2024-09-15"),
      },
      {
        student_id: "522i0002",
        semester: "2024-2",
        academic_year: "2024-2025",
        tuition_amount: 15000000,
        is_paid: false,
      },
      // Student 522i0003 - 2 unpaid semesters
      {
        student_id: "522i0003",
        semester: "2024-1",
        academic_year: "2024-2025",
        tuition_amount: 18000000,
        is_paid: false,
      },
      {
        student_id: "522i0003",
        semester: "2024-2",
        academic_year: "2024-2025",
        tuition_amount: 18000000,
        is_paid: false,
      },
    ]);

    console.log("✅ Test data seeded successfully!");
    console.log("👤 Test Users:");
    console.log("   - cuongcfvipss5 / 123456 (Balance: 50M VND)");
    console.log("   - mqcuong1603 / 123456 (Balance: 50M VND)");
    console.log("   - testuser / 123456 (Balance: 100M VND)");
    console.log("🎓 Test Students:");
    console.log(
      "   - 522i0001: Tran Van B (3 unpaid semesters, 60M VND total)"
    );
    console.log(
      "   - 522i0002: Le Thi C (1 paid, 1 unpaid semester, 15M VND remaining)"
    );
    console.log(
      "   - 522i0003: Pham Minh D (2 unpaid semesters, 36M VND total)"
    );
  } catch (error) {
    console.error("❌ Test data seeding failed:", error);
    throw error;
  }
};
