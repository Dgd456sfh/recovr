import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    const totalTransactions = transactions.length;

    const failedTransactions = transactions.filter(
      (transaction) => transaction.status === "FAILED"
    );

    const recoverableTransactions = transactions.filter(
      (transaction) => transaction.recoverable
    );

    const revenueAtRisk = recoverableTransactions.reduce(
      (total, transaction) => total + transaction.amount,
      0
    );

    const successfulPayments = transactions.filter(
      (transaction) => transaction.status === "SUCCESS"
    ).length;

    const paymentLinksGenerated = transactions.filter(
      (transaction) =>
        transaction.recoveryStatus === "PAYMENT_LINK_GENERATED"
    ).length;

    const retriesScheduled = transactions.filter(
      (transaction) =>
        transaction.recoveryStatus === "RETRY_SCHEDULED"
    ).length;

    const pendingCases = transactions.filter(
      (transaction) =>
        transaction.recoveryStatus === "PENDING"
    ).length;

    const failureReasonsMap: Record<string, number> = {};

    failedTransactions.forEach((transaction) => {
      const reason =
        transaction.failureReason || "Unknown";

      failureReasonsMap[reason] =
        (failureReasonsMap[reason] || 0) + 1;
    });

    const failureReasons = Object.entries(
      failureReasonsMap
    ).map(([reason, count]) => ({
      reason,
      count,
    }));

    const recoveryStatusMap: Record<string, number> = {};

    transactions.forEach((transaction) => {
      const status =
        transaction.recoveryStatus || "PENDING";

      recoveryStatusMap[status] =
        (recoveryStatusMap[status] || 0) + 1;
    });

    const recoveryStatuses = Object.entries(
      recoveryStatusMap
    ).map(([status, count]) => ({
      status,
      count,
    }));

    return NextResponse.json({
      success: true,

      overview: {
        totalTransactions,
        successfulPayments,
        failedTransactions: failedTransactions.length,
        recoverableTransactions:
          recoverableTransactions.length,
        revenueAtRisk,
      },

      actions: {
        paymentLinksGenerated,
        retriesScheduled,
        pendingCases,
        executedActions:
          paymentLinksGenerated + retriesScheduled,
      },

      failureReasons,

      recoveryStatuses,
    });
  } catch (error) {
    console.error("Analytics API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load analytics.",
      },
      {
        status: 500,
      }
    );
  }
}