import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Student = sequelize.define(
  "Student",
  {
    student_id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false,
      comment: "Student ID (MSSV)",
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    major: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Student major/program",
    },
    enrollment_year: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Year student enrolled",
    },
  },
  {
    tableName: "students",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Student;
