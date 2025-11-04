import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const TransactionLock = sequelize.define(
  "TransactionLock",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    resource_type: {
      type: DataTypes.ENUM("user_account", "student_tuition", "semester_tuition"),
      allowNull: false,
      comment: "Type of resource being locked",
    },
    resource_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "transaction_locks",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["resource_type", "resource_id"],
      },
      {
        fields: ["expires_at"],
      },
    ],
  }
);

export default TransactionLock;
