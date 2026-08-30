import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const [
      transactions,
      incidents,
      recoveryEvents,
    ] = await Promise.all([
      prisma.transaction.findMany({
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.incident.findMany({
        orderBy: {
          detectedAt: "desc",
        },
      }),

      prisma.recoveryEvent.findMany({
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const totalTransactions =
      transactions.length;

    const failedTransactions =
      transactions.filter(
        (transaction) =>
          transaction.status === "FAILED"
      );

    const recoveredTransactions =
      transactions.filter(
        (transaction) =>
          transaction.recovered === true
      );

    const revenueAtRisk =
      failedTransactions.reduce(
        (sum, transaction) =>
          sum + transaction.amount,
        0
      );

    const recoveredRevenue =
      recoveredTransactions.reduce(
        (sum, transaction) =>
          sum +
          (transaction.recoveredAmount ??
            transaction.amount),
        0
      );

    const expectedRecoveredRevenue =
      failedTransactions.reduce(
        (sum, transaction) => {
          const confidence =
            transaction.confidence ?? 0;

          return (
            sum +
            transaction.amount *
              (confidence > 1
                ? confidence / 100
                : confidence)
          );
        },
        0
      );

    const activeIncidents =
      incidents.filter((incident) =>
        [
          "DETECTED",
          "INVESTIGATING",
          "ACTION_REQUIRED",
          "RECOVERING",
          "MONITORING",
        ].includes(incident.status)
      );

    const actionCounts = {
      RETRY: 0,
      PAYMENT_LINK: 0,
      WAIT: 0,
      REVIEW: 0,
    };

    for (const transaction of failedTransactions) {
      const action =
        transaction.recoveryAction ??
        transaction.recommendation;

      if (
        action === "RETRY" ||
        action === "PAYMENT_LINK" ||
        action === "WAIT" ||
        action === "REVIEW"
      ) {
        actionCounts[action]++;
      }
    }

    return NextResponse.json({
      success: true,

      overview: {
        totalTransactions,
        failedTransactions:
          failedTransactions.length,

        recoveredTransactions:
          recoveredTransactions.length,

        recoveryRate:
          failedTransactions.length > 0
            ? Number(
                (
                  recoveredTransactions.length /
                  failedTransactions.length
                ).toFixed(4)
              )
            : 0,

        revenueAtRisk: Number(
          revenueAtRisk.toFixed(2)
        ),

        recoveredRevenue: Number(
          recoveredRevenue.toFixed(2)
        ),

        expectedRecoveredRevenue:
          Number(
            expectedRecoveredRevenue.toFixed(
              2
            )
          ),

        activeIncidents:
          activeIncidents.length,
      },

      recoveryActions: actionCounts,

      recentTransactions:
        transactions.slice(0, 10),

      recentIncidents:
        incidents.slice(0, 10),

      recentRecoveryEvents:
        recoveryEvents.slice(0, 20),
    });
  } catch (error) {
    console.error(
      "GET /api/dashboard error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data.",
      },
      {
        status: 500,
      }
    );
  }
}