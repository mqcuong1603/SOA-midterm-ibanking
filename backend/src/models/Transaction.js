import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Transaction = sequelize.define(
  "Transaction",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    payer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    student_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: {
        model: "students",
        key: "student_id",
      },
    },
    amount: {
      type: DataTypes.DECIMAL(18, 0),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "otp_sent", "completed", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failed_otp_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "transactions",
    timestamps: true,
  }
);

export default Transaction;
