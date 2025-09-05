import bcrypt from "bcrypt";
import User from "../models/User.js";
import Student from "../models/Student.js";
import sequelize from "./database.js";

export const initializeDatabase = async () => {
  try {
    console.log("🔄 Initializing database...");

    // Sync all models
    await sequelize.sync({ force: false });
    console.log("✅ Database tables synchronized");

    const existingUser = await User.findOne({
      where: { username: "mqcuong" },
    });
    const existingStudents = await Student.count();

    if (!existingUser || existingStudents === 0) {
      console.log("🌱 Seeding database with test data...");
      await seedTestData();
    } else {
      console.log("✅ Test data already exists, skipping seed");
    }

    console.log("🎉 Database initialization complete!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

const seedTestData = async () => {
  try {
    const hashedPassword = await bcrypt.hash("123456", 10);

    await User.bulkCreate([
      {
        username: "mqcuong",
        password: hashedPassword,
        full_name: "Cuong Ma",
        email: "cuongcfvipss5@gmail.com",
        phone: "0901234567",
        balance: 50000000,
      },
      {
        username: "williamma",
        password: hashedPassword,
        full_name: "William Ma",
        email: "mqcuong1603@gmail.com",
        phone: "0901234567",
        balance: 50000000,
      },
    ]);
    // Create test students
    await Student.bulkCreate([
      {
        student_id: "522i0001",
        full_name: "Tran Van B",
        tuition_amount: 20000000,
        is_paid: false,
      },
      {
        student_id: "522i0002",
        full_name: "Le Thi C",
        tuition_amount: 15000000,
        is_paid: false,
      },
      {
        student_id: "522i0003",
        full_name: "Pham Minh D",
        tuition_amount: 18000000,
        is_paid: false,
      },
    ]);

    console.log("✅ Test data seeded successfully!");
    console.log("👤 Test Users:");
    console.log("   - mqcuong / 123456 (Balance: 50M VND)");
    console.log("   - williamma / 123456 (Balance: 50M VND)");
    console.log("🎓 Test Students: 522i0001, 522i0002, 522i0003");
  } catch (error) {
    console.error("❌ Test data seeding failed:", error);
    throw error;
  }
};
