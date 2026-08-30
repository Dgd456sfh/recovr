import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type VerifyRequest = {
  transactionId?: string;
  outcome?: "RECOVERED" | "FAILED";
  recoveredAmount?: number;
};

/**
 * STAGE 10
 *
 * Recovery Outcome Verification
 *
 * Flow:
 *
 * Recovery execution
 *        ↓
 * Verify outcome
 *        ↓
 * RECOVERED / RECOVERY_FAILED
 *        ↓
 * Update transaction
 *        ↓
 * Write audit event
 *
 * This implementation is simulation-safe.
 * It does NOT perform a real payment.
 */

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as VerifyRequest;

    const transactionId =
      typeof body.transactionId === "string"
        ? body.transactionId.trim()
        : "";

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: "transactionId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const transaction =
      await prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * ALREADY RECOVERED
     * ---------------------------------------------------------
     */

    if (transaction.recovered) {
      return NextResponse.json({
        success: true,
        outcome: "RECOVERED",
        recovered: true,
        recoveredAmount:
          transaction.recoveredAmount ??
          transaction.amount,
        probability: 1,
        transaction,
        message:
          "Transaction has already been recovered.",
      });
    }

    /*
     * ---------------------------------------------------------
     * VALIDATE THAT A RECOVERY ACTION WAS EXECUTED
     * ---------------------------------------------------------
     */

    const validRecoveryStates = [
      "RETRY_SCHEDULED",
      "PAYMENT_LINK_GENERATED",
      "RECOVERY_FAILED",
    ];

    if (
      !validRecoveryStates.includes(
        transaction.recoveryStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No executed recovery action exists for this transaction.",
          recoveryStatus:
            transaction.recoveryStatus,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * DETERMINE OUTCOME
     *
     * In simulation mode the caller can explicitly provide
     * RECOVERED or FAILED.
     *
     * If no outcome is provided, we default to FAILED.
     * This prevents RECOVR from falsely claiming revenue
     * recovery.
     * ---------------------------------------------------------
     */

    const outcome =
      body.outcome === "RECOVERED"
        ? "RECOVERED"
        : "FAILED";

    /*
     * ---------------------------------------------------------
     * RECOVERED
     * ---------------------------------------------------------
     */

    if (outcome === "RECOVERED") {
      const recoveredAmount =
        typeof body.recoveredAmount === "number" &&
        body.recoveredAmount > 0
          ? Math.min(
              body.recoveredAmount,
              transaction.amount
            )
          : transaction.amount;

      const now = new Date();

      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },

          data: {
            status: "RECOVERED",

            recovered: true,

            recoveredAmount,

            recoveredAt: now,

            recoveryStatus: "RECOVERED",

            reason:
              "Recovery action successfully recovered the payment.",
          },
        });

      await prisma.recoveryEvent.create({
        data: {
          transactionId:
            transaction.id,

          eventType:
            "RECOVERY_OUTCOME",

          action:
            transaction.recoveryAction,

          message:
            `Recovery outcome verified successfully. ₹${recoveredAmount.toLocaleString(
              "en-IN"
            )} recovered.`,
        },
      });

      return NextResponse.json({
        success: true,

        outcome: "RECOVERED",

        recovered: true,

        recoveredAmount,

        probability: 1,

        transaction: updated,

        message:
          "Recovery successfully verified.",
      });
    }

    /*
     * ---------------------------------------------------------
     * RECOVERY FAILED
     * ---------------------------------------------------------
     */

    const updated =
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          status: "FAILED",

          recovered: false,

          recoveredAmount: null,

          recoveredAt: null,

          recoveryStatus:
            "RECOVERY_FAILED",

          reason:
            "The executed recovery action did not recover the payment.",
        },
      });

    await prisma.recoveryEvent.create({
      data: {
        transactionId:
          transaction.id,

        eventType:
          "RECOVERY_OUTCOME",

        action:
          transaction.recoveryAction,

        message:
          "Recovery outcome evaluated. The executed recovery action did not recover the payment in simulation mode.",
      },
    });

    return NextResponse.json({
      success: true,

      outcome: "RECOVERY_FAILED",

      recovered: false,

      recoveredAmount: 0,

      probability: 0,

      transaction: updated,

      message:
        "Recovery outcome verified as failed.",
    });
  } catch (error) {
    console.error(
      "POST /api/recovery/verify error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to verify recovery outcome.",
      },
      {
        status: 500,
      }
    );
  }
}
