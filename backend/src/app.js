import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import sequelize from "./config/database.js";
import { initializeDatabase } from "./config/initDatabase.js";
import authRoutes from "./routes/auth.js";
import studentRoute from "./routes/student.js";
import transactionRoute from "./routes/transaction.js";
import userRoute from "./routes/user.js";
import cors from "cors";
import User from "./models/User.js";
import Student from "./models/Student.js";
import StudentTuition from "./models/StudentTuition.js";
import Transaction from "./models/Transaction.js";
import TransactionHistory from "./models/TransactionHistory.js";
import OtpCode from "./models/OtpCode.js";
import TransactionLock from "./models/TransactionLock.js";
import { startCleanupScheduler } from "./services/cleanupService.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      "http://localhost:4000",
    ],
    credentials: true,
  })
);

// Serve static files from frontend folder
const frontendPath = path.join(__dirname, "../../frontend");
app.use(express.static(frontendPath));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoute);
app.use("/api/transaction", transactionRoute);
app.use("/api/user", userRoute);

// Initialize database with test data
initializeDatabase();

// Start cleanup scheduler for expired transactions and locks
startCleanupScheduler();

export default app;
