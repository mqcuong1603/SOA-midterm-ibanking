import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const TransactionHistory = sequelize.define(
  "TransactionHistory",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "transactions",
        key: "id",
      },
    },
    balance_before: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    balance_after: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
  },
  {
    tableName: "transaction_history",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

export default TransactionHistory;
