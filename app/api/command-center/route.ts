import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateBaseline } from "@/lib/baseline";
import { evaluateRecovery } from "@/lib/recovery/engine";

export async function GET() {
  try {
    /* =====================================================
       SYSTEM HEALTH
    ===================================================== */

    const baseline = await calculateBaseline();

    /* =====================================================
       INCIDENTS
    ===================================================== */

    const incidents = await prisma.incident.findMany({
      orderBy: {
        detectedAt: "desc",
      },
    });

    const activeIncidents = incidents.filter((incident) =>
      [
        "DETECTED",
        "INVESTIGATING",
        "ACTION_REQUIRED",
        "RECOVERING",
      ].includes(incident.status)
    );

    /* =====================================================
       TRANSACTIONS
    ===================================================== */

    const transactions =
      await prisma.transaction.findMany({
        include: {
          recoveryEvents: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    /* =====================================================
       RECOVERY QUEUE
       Only ACTIVE / UNRECOVERED transactions
    ===================================================== */

    const recoveryQueue = transactions
      .map((transaction) => {
        const decision =
          evaluateRecovery(transaction);

        return {
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

          recovered:
            transaction.recovered,

          recoveredAmount:
            transaction.recoveredAmount,

          recoveredAt:
            transaction.recoveredAt,

          recoveryStatus:
            transaction.recoveryStatus,

          recoveryAction:
            transaction.recoveryAction,

          recommendation:
            decision.recommendation,

          confidence:
            decision.confidence,

          priority:
            decision.priority,

          reason:
            decision.reason,

          shouldRecover:
            decision.shouldRecover,

          createdAt:
            transaction.createdAt,

          updatedAt:
            transaction.updatedAt,
        };
      })
      .filter(
        (transaction) =>
          transaction.recoverable &&
          !transaction.recovered
      )
      .sort((a, b) => {
        const priorityOrder = {
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
        };

        return (
          priorityOrder[b.priority] -
          priorityOrder[a.priority]
        );
      });

    /* =====================================================
       RECOVERED TRANSACTIONS

       IMPORTANT:
       These are kept separately from the recovery queue.
    ===================================================== */

    const recoveredTransactions =
      transactions
        .filter(
          (transaction) =>
            transaction.recovered === true
        )
        .map((transaction) => {
          const decision =
            evaluateRecovery(transaction);

          return {
            id:
              transaction.id,

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

            recovered:
              transaction.recovered,

            recoveredAmount:
              transaction.recoveredAmount,

            recoveredAt:
              transaction.recoveredAt,

            recoveryStatus:
              transaction.recoveryStatus,

            recoveryAction:
              transaction.recoveryAction,

            recommendation:
              decision.recommendation,

            confidence:
              decision.confidence,

            priority:
              decision.priority,

            reason:
              decision.reason,

            createdAt:
              transaction.createdAt,

            updatedAt:
              transaction.updatedAt,
          };
        });

    /* =====================================================
       RECOVERED REVENUE
    ===================================================== */

    const recoveredRevenue =
      recoveredTransactions.reduce(
        (total, transaction) =>
          total +
          Number(
            transaction.recoveredAmount ?? 0
          ),
        0
      );

    /* =====================================================
       REVENUE AT RISK
    ===================================================== */

    const revenueAtRisk =
      recoveryQueue.reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount ?? 0),
        0
      );

    /* =====================================================
       RECOVERABLE REVENUE

       Includes recovered + currently recoverable.
    ===================================================== */

    const recoverableRevenue =
      transactions
        .filter(
          (transaction) =>
            transaction.recoverable
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(transaction.amount ?? 0),
          0
        );

    /* =====================================================
       RECOVERY RATE
    ===================================================== */

    const recoveryRate =
      recoverableRevenue > 0
        ? Math.round(
            (recoveredRevenue /
              recoverableRevenue) *
              1000
          ) / 10
        : 0;

    /* =====================================================
       ACTIVITY / AUDIT TIMELINE
    ===================================================== */

    const activity =
      transactions
        .flatMap((transaction) =>
          transaction.recoveryEvents.map(
            (event) => ({
              id:
                event.id,

              transactionId:
                transaction.id,

              paymentId:
                transaction.paymentId,

              customerEmail:
                transaction.customerEmail,

              type:
                event.eventType,

              action:
                event.action,

              message:
                event.message,

              amount:
                transaction.amount,

              createdAt:
                event.createdAt,
            })
          )
        )
        .sort(
          (a, b) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        )
        .slice(0, 20);

    /* =====================================================
       OVERVIEW
    ===================================================== */

    const overview = {
      totalTransactions:
        transactions.length,

      activeIncidents:
        activeIncidents.length,

      totalIncidents:
        incidents.length,

      revenueAtRisk,

      recoverableRevenue,

      recoveredRevenue,

      recoveredAmount:
        recoveredRevenue,

      recoveredCases:
        recoveredTransactions.length,

      activeRecoveryCases:
        recoveryQueue.length,

      recoveryRate,

      currency:
        "INR",
    };

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      generatedAt:
        new Date(),

      overview,

      health: {
        status:
          baseline.anomaly
            ? "DEGRADED"
            : "HEALTHY",

        anomalyDetected:
          baseline.anomaly,

        totalEvents:
          baseline.totalEvents,

        successfulEvents:
          baseline.successfulEvents,

        failedEvents:
          baseline.failedEvents,

        successRate:
          Math.round(
            baseline.successRate * 10
          ) / 10,

        failureRate:
          Math.round(
            baseline.failureRate * 10
          ) / 10,

        reason:
          baseline.reason,
      },

      incidents: {
        total:
          incidents.length,

        active:
          activeIncidents.length,

        items:
          incidents,
      },

      recoveryQueue: {
        total:
          recoveryQueue.length,

        actionable:
          recoveryQueue.filter(
            (item) =>
              item.shouldRecover
          ).length,

        items:
          recoveryQueue,
      },

      /* ===================================================
         THIS IS THE IMPORTANT NEW SECTION
      =================================================== */

      recoveredTransactions: {
        total:
          recoveredTransactions.length,

        items:
          recoveredTransactions,
      },

      activity: {
        total:
          activity.length,

        items:
          activity,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/command-center error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to load Recovery Command Center.",
      },
      {
        status: 500,
      }
    );
  }
}