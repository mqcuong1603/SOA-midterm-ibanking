import Transaction from "../models/Transaction.js";
import TransactionLock from "../models/TransactionLock.js";
import OtpCode from "../models/OtpCode.js";
import sequelize from "../config/database.js";
import { Op } from "sequelize";

/**
 * Clean up expired transactions that have been in pending/otp_sent state
 * for more than 1 hour
 */
export async function cleanupExpiredTransactions() {
  const dbTransaction = await sequelize.transaction();
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    // Find all transactions in pending or otp_sent state older than 1 hour
    const expiredTransactions = await Transaction.findAll({
      where: {
        status: ["pending", "otp_sent"],
        createdAt: { [Op.lt]: oneHourAgo },
      },
    });

    if (expiredTransactions.length === 0) {
      console.log("✅ Cleanup: No expired transactions found");
      await dbTransaction.commit();
      return { cleaned: 0, message: "No expired transactions found" };
    }

    console.log(
      `🧹 Cleanup: Found ${expiredTransactions.length} expired transactions`
    );

    // Update all expired transactions to failed status
    const transactionIds = expiredTransactions.map((t) => t.id);
    const payerIds = expiredTransactions.map((t) => t.payer_id);
    const tuitionIds = expiredTransactions.map((t) => t.tuition_id);

    // Mark transactions as failed
    await Transaction.update(
      {
        status: "failed",
        completed_at: new Date(),
      },
      {
        where: { id: transactionIds },
        transaction: dbTransaction,
      }
    );

    // Release all related locks
    await TransactionLock.destroy({
      where: {
        [Op.or]: [
          {
            resource_type: "user_account",
            resource_id: { [Op.in]: payerIds.map((id) => id.toString()) },
          },
          {
            resource_type: "semester_tuition",
            resource_id: { [Op.in]: tuitionIds.map((id) => id.toString()) },
          },
        ],
      },
      transaction: dbTransaction,
    });

    // Mark all unused OTPs as used for these transactions
    await OtpCode.update(
      { is_used: true },
      {
        where: {
          transaction_id: { [Op.in]: transactionIds },
          is_used: false,
        },
        transaction: dbTransaction,
      }
    );

    await dbTransaction.commit();

    console.log(
      `✅ Cleanup: Successfully cleaned up ${expiredTransactions.length} expired transactions`
    );
    return {
      cleaned: expiredTransactions.length,
      message: `Cleaned up ${expiredTransactions.length} expired transactions`,
      transaction_ids: transactionIds,
    };
  } catch (error) {
    await dbTransaction.rollback();
    console.error("❌ Cleanup error:", error);
    throw error;
  }
}

/**
 * Clean up expired locks that are past their expiration time
 */
export async function cleanupExpiredLocks() {
  try {
    const now = new Date();

    // Delete all locks that have expired
    const deletedCount = await TransactionLock.destroy({
      where: {
        expires_at: { [Op.lt]: now },
      },
    });

    if (deletedCount > 0) {
      console.log(`✅ Cleanup: Removed ${deletedCount} expired locks`);
    }

    return {
      cleaned: deletedCount,
      message: `Removed ${deletedCount} expired locks`,
    };
  } catch (error) {
    console.error("❌ Lock cleanup error:", error);
    throw error;
  }
}

/**
 * Clean up old OTP codes (older than 24 hours)
 */
export async function cleanupOldOtpCodes() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Delete OTP codes older than 24 hours
    const deletedCount = await OtpCode.destroy({
      where: {
        createdAt: { [Op.lt]: twentyFourHoursAgo },
      },
    });

    if (deletedCount > 0) {
      console.log(`✅ Cleanup: Removed ${deletedCount} old OTP codes`);
    }

    return {
      cleaned: deletedCount,
      message: `Removed ${deletedCount} old OTP codes`,
    };
  } catch (error) {
    console.error("❌ OTP cleanup error:", error);
    throw error;
  }
}

/**
 * Run all cleanup tasks
 */
export async function runAllCleanupTasks() {
  console.log("🧹 Starting scheduled cleanup tasks...");
  const results = {
    timestamp: new Date(),
    transactions: null,
    locks: null,
    otps: null,
  };

  try {
    results.transactions = await cleanupExpiredTransactions();
    results.locks = await cleanupExpiredLocks();
    results.otps = await cleanupOldOtpCodes();
    console.log("✅ All cleanup tasks completed successfully");
  } catch (error) {
    console.error("❌ Cleanup tasks failed:", error);
  }

  return results;
}

/**
 * Start periodic cleanup (runs every 30 minutes)
 */
export function startCleanupScheduler() {
  console.log("🚀 Starting cleanup scheduler (runs every 30 minutes)");

  // Run immediately on startup
  runAllCleanupTasks();

  // Then run every 30 minutes
  const thirtyMinutes = 30 * 60 * 1000;
  setInterval(runAllCleanupTasks, thirtyMinutes);
}
