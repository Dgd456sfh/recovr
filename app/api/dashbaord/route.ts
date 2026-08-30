import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const transactions =
      await prisma.transaction.findMany({
        orderBy: {
          createdAt: "desc",
        },

        include: {
          paymentEvents: {
            orderBy: {
              createdAt: "desc",
            },

            take: 1,
          },

          recoveryEvents: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    const incidents =
      await prisma.incident.findMany({
        orderBy: {
          detectedAt: "desc",
        },

        take: 10,
      });

    const totalTransactions =
      transactions.length;

    const failedTransactions =
      transactions.filter(
        (transaction) =>
          transaction.status === "FAILED"
      );

    const recoverableTransactions =
      transactions.filter(
        (transaction) =>
          transaction.recoverable === true
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

    const recoverableRevenue =
      recoverableTransactions.reduce(
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
      transactions.reduce(
        (sum, transaction) => {
          if (
            !transaction.recommendation ||
            !transaction.confidence
          ) {
            return sum;
          }

          /*
            Confidence is stored as 0–100.
            This is a dashboard estimate,
            not real money movement.
          */
          return (
            sum +
            transaction.amount *
              (transaction.confidence / 100)
          );
        },
        0
      );

    const recoverySuccessRate =
      recoverableTransactions.length > 0
        ? Number(
            (
              (recoveredTransactions.length /
                recoverableTransactions.length) *
              100
            ).toFixed(2)
          )
        : 0;

    const statusBreakdown = {
      pending: transactions.filter(
        (transaction) =>
          transaction.recoveryStatus ===
          "PENDING"
      ).length,

      recovering: transactions.filter(
        (transaction) =>
          transaction.recoveryStatus ===
            "RECOVERING" ||
          transaction.recoveryStatus ===
            "RETRY_EXECUTED"
      ).length,

      actionRequired: transactions.filter(
        (transaction) =>
          transaction.recoveryStatus ===
            "ACTION_REQUIRED" ||
          transaction.recoveryStatus ===
            "PAYMENT_LINK_READY"
      ).length,

      waiting: transactions.filter(
        (transaction) =>
          transaction.recoveryStatus ===
          "WAITING"
      ).length,

      review: transactions.filter(
        (transaction) =>
          transaction.recoveryStatus ===
            "REVIEW_REQUIRED" ||
          transaction.recoveryStatus ===
            "MANUAL_REVIEW"
      ).length,

      recovered: transactions.filter(
        (transaction) =>
          transaction.recoveryStatus ===
          "RECOVERED"
      ).length,

      notRecovered: transactions.filter(
        (transaction) =>
          transaction.recoveryStatus ===
          "NOT_RECOVERED"
      ).length,
    };

    const recommendationBreakdown = {
      retry: transactions.filter(
        (transaction) =>
          transaction.recommendation ===
          "RETRY"
      ).length,

      paymentLink: transactions.filter(
        (transaction) =>
          transaction.recommendation ===
          "PAYMENT_LINK"
      ).length,

      wait: transactions.filter(
        (transaction) =>
          transaction.recommendation ===
          "WAIT"
      ).length,

      review: transactions.filter(
        (transaction) =>
          transaction.recommendation ===
          "REVIEW"
      ).length,
    };

    const recentRecoveryEvents =
      await prisma.recoveryEvent.findMany({
        orderBy: {
          createdAt: "desc",
        },

        take: 20,

        include: {
          transaction: true,
        },
      });

    return NextResponse.json({
      success: true,

      summary: {
        totalTransactions,

        failedTransactions:
          failedTransactions.length,

        recoverableTransactions:
          recoverableTransactions.length,

        recoveredTransactions:
          recoveredTransactions.length,

        revenueAtRisk:
          Number(
            revenueAtRisk.toFixed(2)
          ),

        recoverableRevenue:
          Number(
            recoverableRevenue.toFixed(2)
          ),

        expectedRecoveredRevenue:
          Number(
            expectedRecoveredRevenue.toFixed(2)
          ),

        recoveredRevenue:
          Number(
            recoveredRevenue.toFixed(2)
          ),

        recoverySuccessRate,
      },

      statusBreakdown,

      recommendationBreakdown,

      transactions:
        transactions.map(
          (transaction) => ({
            id: transaction.id,

            paymentId:
              transaction.paymentId,

            customerEmail:
              transaction.customerEmail,

            amount:
              transaction.amount,

            currency:
              transaction.currency,

            status:
              transaction.status,

            failureReason:
              transaction.failureReason,

            recoverable:
              transaction.recoverable,

            recommendation:
              transaction.recommendation,

            confidence:
              transaction.confidence,

            reason:
              transaction.reason,

            recoveryStatus:
              transaction.recoveryStatus,

            recoveryAction:
              transaction.recoveryAction,

            recovered:
              transaction.recovered,

            recoveredAmount:
              transaction.recoveredAmount,

            recoveredAt:
              transaction.recoveredAt,

            paymentEvent:
              transaction.paymentEvents[0] ??
              null,

            createdAt:
              transaction.createdAt,
          })
        ),

      incidents,

      recentRecoveryEvents:
        recentRecoveryEvents.map(
          (event) => ({
            id: event.id,

            eventType:
              event.eventType,

            action:
              event.action,

            message:
              event.message,

            createdAt:
              event.createdAt,

            transaction: {
              id:
                event.transaction.id,

              paymentId:
                event.transaction.paymentId,

              amount:
                event.transaction.amount,

              customerEmail:
                event.transaction.customerEmail,
            },
          })
        ),
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
            : "Failed to load RECOVR dashboard.",
      },
      {
        status: 500,
      }
    );
  }
}