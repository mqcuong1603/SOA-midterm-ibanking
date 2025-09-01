import express from "express";
import dotenv from "dotenv";
import sequelize from "./config/database.js";
import authRoutes from "./routes/auth.js";
import User from "./models/User.js";
import Student from "./models/Student.js";
import devRoutes from "./routes/dev.js";
import cors from "cors";

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
app.use("/api/dev", devRoutes);

// database initialization
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully.");

    await sequelize.sync({ force: false });
    console.log("✅ Database tables created successfully!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
};
initializeDatabase();

export default app;
