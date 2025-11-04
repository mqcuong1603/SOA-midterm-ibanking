/**
 * Model Associations
 * Defines relationships between all database models
 */

import User from "./User.js";
import Student from "./Student.js";
import StudentTuition from "./StudentTuition.js";
import Transaction from "./Transaction.js";
import TransactionHistory from "./TransactionHistory.js";
import OtpCode from "./OtpCode.js";
import TransactionLock from "./TransactionLock.js";

export const defineAssociations = () => {
  // Student <-> StudentTuition
  Student.hasMany(StudentTuition, {
    foreignKey: "student_id",
    as: "tuitions",
    onDelete: "CASCADE",
  });
  StudentTuition.belongsTo(Student, {
    foreignKey: "student_id",
    as: "student",
  });

  // User <-> Transaction
  User.hasMany(Transaction, {
    foreignKey: "payer_id",
    as: "transactions",
    onDelete: "CASCADE",
  });
  Transaction.belongsTo(User, {
    foreignKey: "payer_id",
    as: "payer",
  });

  // Student <-> Transaction
  Student.hasMany(Transaction, {
    foreignKey: "student_id",
    as: "transactions",
    onDelete: "CASCADE",
  });
  Transaction.belongsTo(Student, {
    foreignKey: "student_id",
    as: "student",
  });

  // StudentTuition <-> Transaction
  StudentTuition.hasMany(Transaction, {
    foreignKey: "tuition_id",
    as: "transactions",
    onDelete: "CASCADE",
  });
  Transaction.belongsTo(StudentTuition, {
    foreignKey: "tuition_id",
    as: "tuition",
  });

  // Transaction <-> OtpCode
  Transaction.hasMany(OtpCode, {
    foreignKey: "transaction_id",
    as: "otpCodes",
    onDelete: "CASCADE",
  });
  OtpCode.belongsTo(Transaction, {
    foreignKey: "transaction_id",
    as: "transaction",
  });

  // User <-> TransactionHistory
  User.hasMany(TransactionHistory, {
    foreignKey: "user_id",
    as: "history",
    onDelete: "CASCADE",
  });
  TransactionHistory.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  // Transaction <-> TransactionHistory
  Transaction.hasMany(TransactionHistory, {
    foreignKey: "transaction_id",
    as: "history",
    onDelete: "CASCADE",
  });
  TransactionHistory.belongsTo(Transaction, {
    foreignKey: "transaction_id",
    as: "transaction",
  });

  console.log("✅ Model associations defined");
};

export default defineAssociations;
