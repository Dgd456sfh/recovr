import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { evaluateRecovery } from "@/lib/recovery/engine";

type RecoveryAction =
  | "RETRY"
  | "PAYMENT_LINK"
  | "MARK_RECOVERED";

/* =========================================================
   RECOVERY STATE HELPERS
   ========================================================= */

function isRecoveredTransaction(transaction: {
  recovered: boolean;
  status: string;
  recoveryStatus: string;
}) {
  return (
    transaction.recovered ||
    transaction.status === "RECOVERED" ||
    transaction.recoveryStatus === "RECOVERED"
  );
}

function hasRecoveryActionBeenExecuted(
  recoveryStatus: string
) {
  return (
    recoveryStatus === "RETRY_SCHEDULED" ||
    recoveryStatus === "PAYMENT_LINK_GENERATED" ||
    recoveryStatus === "EXECUTED"
  );
}

/* =========================================================
   GET — RECOVERY COMMAND CENTER
   ========================================================= */

export async function GET() {
  try {
    const transactions =
      await prisma.transaction.findMany({
        orderBy: {
          createdAt: "desc",
        },

        include: {
          recoveryEvents: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    /* =====================================================
       BUILD RECOVERY CASES
       ===================================================== */

    const cases = transactions.map((transaction) => {
      const isRecovered =
        isRecoveredTransaction(transaction);

      /*
       * Recovered payments are final.
       * Do not run the recovery engine again.
       */
      const decision = isRecovered
        ? {
            recommendation: "NO_ACTION",
            confidence: 100,
            reason:
              "Payment has already been successfully recovered.",
            priority: "LOW",
            shouldRecover: false,
          }
        : evaluateRecovery(transaction);

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

        reason:
          decision.reason,

        priority:
          decision.priority,

        shouldRecover:
          decision.shouldRecover,

        recoveryEvents:
          transaction.recoveryEvents,

        createdAt:
          transaction.createdAt,

        updatedAt:
          transaction.updatedAt,
      };
    });

    /* =====================================================
       ACTIVE RECOVERY CASES
       ===================================================== */

    /*
     * An active recovery case must:
     *
     * 1. Be recoverable
     * 2. NOT already be recovered
     *
     * This intentionally excludes:
     *
     * - Successful transactions
     * - Non-recoverable transactions
     * - Already recovered transactions
     *
     * Executed actions remain active until the outcome
     * has been confirmed.
     */
    const activeCases =
      cases.filter(
        (transaction) =>
          transaction.recoverable &&
          !isRecoveredTransaction(
            transaction
          )
      );

    /* =====================================================
       RECOVERED CASES
       ===================================================== */

    const recoveredCases =
      cases.filter(
        (transaction) =>
          isRecoveredTransaction(
            transaction
          )
      );

    /* =====================================================
       REVIEW CASES
       ===================================================== */

    /*
     * Review cases are unresolved transactions
     * whose recovery engine recommends REVIEW.
     */
    const reviewCases =
      cases.filter(
        (transaction) =>
          !isRecoveredTransaction(
            transaction
          ) &&
          transaction.recommendation ===
            "REVIEW"
      );

    /* =====================================================
       REVENUE AT RISK
       ===================================================== */

    const revenueAtRisk =
      activeCases.reduce(
        (total, transaction) =>
          total + transaction.amount,
        0
      );

    /* =====================================================
       RECOVERED REVENUE
       ===================================================== */

    const recoveredAmount =
      recoveredCases.reduce(
        (total, transaction) =>
          total +
          (transaction.recoveredAmount ??
            0),
        0
      );

    /* =====================================================
       TOTAL RECOVERABLE REVENUE
       ===================================================== */

    const totalRecoverableAmount =
      transactions
        .filter(
          (transaction) =>
            transaction.recoverable
        )
        .reduce(
          (total, transaction) =>
            total + transaction.amount,
          0
        );

    /* =====================================================
       RECOVERY RATE
       ===================================================== */

    const recoveryRate =
      totalRecoverableAmount > 0
        ? Math.round(
            (recoveredAmount /
              totalRecoverableAmount) *
              1000
          ) / 10
        : 0;

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json({
      success: true,

      summary: {
        totalTransactions:
          transactions.length,

        activeRecoveryCases:
          activeCases.length,

        reviewRequired:
          reviewCases.length,

        recoveredCases:
          recoveredCases.length,

        revenueAtRisk,

        recoveredAmount,

        recoveryRate,

        currency: "INR",
      },

      /*
       * IMPORTANT:
       *
       * Only unresolved recoverable transactions
       * are returned to the Recovery Queue.
       *
       * This prevents successful and non-recoverable
       * transactions from appearing as active cases.
       */
      cases: activeCases,
    });
  } catch (error) {
    console.error(
      "GET /api/recovery error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch recovery data.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST — EXECUTE RECOVERY ACTION
   ========================================================= */

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const transactionId =
      body.transactionId;

    const requestedAction =
      body.action as
        | RecoveryAction
        | undefined;

    /* =====================================================
       VALIDATE TRANSACTION ID
       ===================================================== */

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,

          error:
            "transactionId is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       FIND TRANSACTION
       ===================================================== */

    const transaction =
      await prisma.transaction.findUnique(
        {
          where: {
            id: transactionId,
          },
        }
      );

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Transaction not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       BLOCK ACTIONS ON RECOVERED TRANSACTIONS
       ===================================================== */

    if (
      isRecoveredTransaction(
        transaction
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "This transaction has already been recovered.",
        },
        {
          status: 409,
        }
      );
    }

    /* =====================================================
       MARK PAYMENT AS RECOVERED
       ===================================================== */

    if (
      requestedAction ===
      "MARK_RECOVERED"
    ) {
      /*
       * A payment can only be confirmed as recovered
       * after RECOVR has executed a recovery action.
       *
       * Valid previous states:
       *
       * RETRY_SCHEDULED
       * PAYMENT_LINK_GENERATED
       * EXECUTED
       */
      if (
        !hasRecoveryActionBeenExecuted(
          transaction.recoveryStatus
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              "A recovery action must be executed before confirming recovery.",
          },
          {
            status: 400,
          }
        );
      }

      /* =================================================
         UPDATE TRANSACTION
         ================================================= */

      const updated =
        await prisma.transaction.update(
          {
            where: {
              id: transaction.id,
            },

            data: {
              status:
                "RECOVERED",

              recovered:
                true,

              recoveredAmount:
                transaction.amount,

              recoveredAt:
                new Date(),

              recoveryStatus:
                "RECOVERED",
            },
          }
        );

      /* =================================================
         CREATE RECOVERY EVENT
         ================================================= */

      await prisma.recoveryEvent.create(
        {
          data: {
            transactionId:
              transaction.id,

            eventType:
              "PAYMENT_RECOVERED",

            action:
              transaction.recoveryAction,

            message:
              "Payment recovery was confirmed successfully.",
          },
        }
      );

      return NextResponse.json({
        success: true,

        action:
          "MARK_RECOVERED",

        message:
          "Payment successfully marked as recovered.",

        transaction:
          updated,
      });
    }

    /* =====================================================
       EVALUATE RECOVERY
       ===================================================== */

    const decision =
      evaluateRecovery(transaction);

    /* =====================================================
       PERSIST LATEST DECISION
       ===================================================== */

    await prisma.transaction.update({
      where: {
        id: transaction.id,
      },

      data: {
        recommendation:
          decision.recommendation,

        confidence:
          decision.confidence,

        reason:
          decision.reason,
      },
    });

    /* =====================================================
       BLOCK NON-RECOVERABLE / REVIEW CASES
       ===================================================== */

    if (!decision.shouldRecover) {
      await prisma.recoveryEvent.create(
        {
          data: {
            transactionId:
              transaction.id,

            eventType:
              "RECOVERY_REVIEW_REQUIRED",

            action:
              decision.recommendation,

            message:
              decision.reason,
          },
        }
      );

      return NextResponse.json(
        {
          success: false,

          recommendation:
            decision.recommendation,

          confidence:
            decision.confidence,

          reason:
            decision.reason,

          error:
            "This transaction requires manual review and cannot be automatically recovered.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       VALIDATE REQUESTED ACTION
       ===================================================== */

    if (
      requestedAction !==
        "RETRY" &&
      requestedAction !==
        "PAYMENT_LINK"
    ) {
      return NextResponse.json(
        {
          success: false,

          recommendation:
            decision.recommendation,

          error:
            "Invalid recovery action.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       ACTION MUST MATCH RECOMMENDATION
       ===================================================== */

    if (
      requestedAction !==
      decision.recommendation
    ) {
      return NextResponse.json(
        {
          success: false,

          recommendedAction:
            decision.recommendation,

          requestedAction,

          error:
            "Requested action does not match the recommended recovery strategy.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       DUPLICATE ACTION GUARDRAIL
       ===================================================== */

    if (
      hasRecoveryActionBeenExecuted(
        transaction.recoveryStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "A recovery action has already been executed for this transaction.",

          recoveryStatus:
            transaction.recoveryStatus,
        },
        {
          status: 409,
        }
      );
    }

    /* =====================================================
       EXECUTE CONTROLLED RETRY
       ===================================================== */

    if (
      requestedAction ===
      "RETRY"
    ) {
      const updated =
        await prisma.transaction.update(
          {
            where: {
              id: transaction.id,
            },

            data: {
              recoveryStatus:
                "RETRY_SCHEDULED",

              recoveryAction:
                "CONTROLLED_RETRY",

              recommendation:
                decision.recommendation,

              confidence:
                decision.confidence,

              reason:
                decision.reason,
            },
          }
        );

      /* =================================================
         RECOVERY EVENT
         ================================================= */

      await prisma.recoveryEvent.create(
        {
          data: {
            transactionId:
              transaction.id,

            eventType:
              "RETRY_SCHEDULED",

            action:
              "CONTROLLED_RETRY",

            message:
              "RECOVR scheduled a controlled retry. " +
              decision.reason,
          },
        }
      );

      return NextResponse.json({
        success: true,

        action:
          "RETRY",

        message:
          "Controlled payment retry scheduled successfully.",

        decision,

        transaction:
          updated,
      });
    }

    /* =====================================================
       EXECUTE PAYMENT LINK RECOVERY
       ===================================================== */

    const updated =
      await prisma.transaction.update(
        {
          where: {
            id: transaction.id,
          },

          data: {
            recoveryStatus:
              "PAYMENT_LINK_GENERATED",

            recoveryAction:
              "PAYMENT_LINK",

            recommendation:
              decision.recommendation,

            confidence:
              decision.confidence,

            reason:
              decision.reason,
          },
        }
      );

    /* =====================================================
       RECOVERY EVENT
       ===================================================== */

    await prisma.recoveryEvent.create(
      {
        data: {
          transactionId:
            transaction.id,

          eventType:
            "PAYMENT_LINK_GENERATED",

          action:
            "PAYMENT_LINK",

          message:
            "RECOVR generated a payment recovery link. " +
            decision.reason,
        },
      }
    );

    return NextResponse.json({
      success: true,

      action:
        "PAYMENT_LINK",

      message:
        "Payment link recovery flow generated successfully.",

      decision,

      transaction:
        updated,
    });
  } catch (error) {
    console.error(
      "POST /api/recovery error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to execute recovery action.",
      },
      {
        status: 500,
      }
    );
  }
}