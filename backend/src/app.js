import express from "express";
import dotenv from "dotenv";
import sequelize from "./config/database.js";
import { initializeDatabase } from "./config/initDatabase.js";
import authRoutes from "./routes/auth.js";
import studentRoute from "./routes/student.js";
import transactionRoute from "./routes/transaction.js";
import userRoute from "./routes/user.js";
import cors from "cors";
import User from "./models/User.js";
import Student from "./models/Student.js";
import Transaction from "./models/Transaction.js";
import TransactionHistory from "./models/TransactionHistory.js";
import OtpCode from "./models/OtpCode.js";
import TransactionLock from "./models/TransactionLock.js";

// load environment variables
dotenv.config();
const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5500",
    ],
    credentials: true,
  })
);

// routes
app.get("/", (req, res) => {
  res.json({ message: "Hello World!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoute);
app.use("/api/transaction", transactionRoute);
app.use("/api/user", userRoute);

// Initialize database with test data
initializeDatabase();

export default app;
