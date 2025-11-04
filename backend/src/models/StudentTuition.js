import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const StudentTuition = sequelize.define(
  "StudentTuition",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    student_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: {
        model: "students",
        key: "student_id",
      },
    },
    semester: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'e.g., "2024-1", "2024-2", "2024-Summer"',
    },
    academic_year: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'e.g., "2024-2025"',
    },
    tuition_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: "Tuition fee for this semester in VND",
    },
    is_paid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Payment status for this semester",
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the tuition was paid",
    },
  },
  {
    tableName: "student_tuition",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default StudentTuition;
