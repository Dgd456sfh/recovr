import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRecoveryPaymentLink } from "@/lib/razorpay/payment-links";

type ExecuteRequest = {
  transactionId?: string;
};

type RecoveryAction =
  | "CONTROLLED_RETRY"
  | "PAYMENT_LINK"
  | "NO_ACTION";

function normalizeAction(value: unknown): RecoveryAction | null {
  if (typeof value !== "string") return null;

  const action = value.trim().toUpperCase();

  if (
    action === "CONTROLLED_RETRY" ||
    action === "RETRY"
  ) {
    return "CONTROLLED_RETRY";
  }

  if (
    action === "PAYMENT_LINK" ||
    action === "PAYMENT_LINK_GENERATED"
  ) {
    return "PAYMENT_LINK";
  }

  if (action === "NO_ACTION") {
    return "NO_ACTION";
  }

  return null;
}

function getAction(
  recoveryAction: unknown,
  recommendation: unknown,
): RecoveryAction | null {
  return (
    normalizeAction(recoveryAction) ??
    normalizeAction(recommendation)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExecuteRequest;

    const transactionId = body.transactionId?.trim();

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: "transactionId is required.",
        },
        { status: 400 },
      );
    }

    const transaction =
      await prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },
        include: {
          recoveryEvents: {
            orderBy: {
              createdAt: "desc",
            },
            take: 20,
          },
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found.",
        },
        { status: 404 },
      );
    }

    /*
     * SAFETY:
     * Never execute another recovery action
     * after successful recovery.
     */
    if (transaction.recovered) {
      return NextResponse.json({
        success: true,
        executed: false,
        alreadyRecovered: true,
        action: transaction.recoveryAction,
        transaction,
        message:
          "Payment has already been successfully recovered.",
      });
    }

    const action = getAction(
      transaction.recoveryAction,
      transaction.recommendation,
    );

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No valid recovery action found for this transaction.",
          availableActions: [
            "CONTROLLED_RETRY",
            "PAYMENT_LINK",
            "NO_ACTION",
          ],
          transactionId: transaction.id,
        },
        { status: 400 },
      );
    }

    /*
     * ========================================================
     * NO ACTION
     * ========================================================
     */

    if (action === "NO_ACTION") {
      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            recoveryStatus: "NO_ACTION",
            recoveryAction: "NO_ACTION",
            recommendation: "NO_ACTION",
            reason:
              "RECOVR determined that no recovery action should be executed.",
          },
          include: {
            recoveryEvents: {
              orderBy: {
                createdAt: "desc",
              },
              take: 20,
            },
          },
        });

      return NextResponse.json({
        success: true,
        executed: false,
        action: "NO_ACTION",
        transaction: updated,
        message:
          "No recovery action was required.",
      });
    }

    /*
     * ========================================================
     * CONTROLLED RETRY
     * ========================================================
     *
     * IMPORTANT:
     * Razorpay does not expose an API that simply retries
     * an arbitrary failed payment.
     *
     * The next stage will create a new Razorpay Order and
     * checkout attempt.
     *
     * For now we preserve the controlled retry state.
     */

    if (action === "CONTROLLED_RETRY") {
      const event =
        await prisma.recoveryEvent.create({
          data: {
            transactionId: transaction.id,
            eventType: "RECOVERY_ATTEMPT",
            action: "CONTROLLED_RETRY",
            message:
              "RECOVR approved a controlled retry. A new Razorpay checkout attempt will be created by the retry executor.",
          },
        });

      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            recoveryStatus: "RETRY_SCHEDULED",
            recoveryAction: "CONTROLLED_RETRY",
            recommendation: "RETRY",
            reason:
              "RECOVR approved a controlled retry for the failed payment.",
          },
          include: {
            recoveryEvents: {
              orderBy: {
                createdAt: "desc",
              },
              take: 20,
            },
          },
        });

      return NextResponse.json({
        success: true,
        executed: true,
        action: "CONTROLLED_RETRY",
        simulation: false,
        retryMode:
          "NEW_RAZORPAY_CHECKOUT_ATTEMPT",
        event,
        transaction: updated,
        message:
          "Controlled retry approved. The next checkout attempt will use a new Razorpay Order.",
      });
    }

    /*
     * ========================================================
     * REAL RAZORPAY PAYMENT LINK
     * ========================================================
     */

    if (action === "PAYMENT_LINK") {
      /*
       * Create an actual Razorpay Test Mode Payment Link.
       *
       * This is NOT a simulation.
       */

      const paymentLink =
        await createRecoveryPaymentLink({
          amount: transaction.amount,
          currency: transaction.currency,
          description:
            `RECOVR recovery for ${transaction.paymentId}`,
          customerEmail:
            transaction.customerEmail,
          referenceId:
            `recovr_${transaction.id}`,
        });

      /*
       * Store the real Razorpay Payment Link ID
       * inside the recovery event.
       *
       * We do not modify the Prisma schema yet,
       * keeping this upgrade backwards compatible.
       */

      const event =
        await prisma.recoveryEvent.create({
          data: {
            transactionId: transaction.id,
            eventType: "PAYMENT_LINK_CREATED",
            action: "PAYMENT_LINK",
            message:
              `Real Razorpay Test Mode Payment Link created: ${paymentLink.id} (${paymentLink.short_url})`,
          },
        });

      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            recoveryStatus:
              "PAYMENT_LINK_GENERATED",
            recoveryAction: "PAYMENT_LINK",
            recommendation: "PAYMENT_LINK",
            reason:
              "RECOVR created a real Razorpay Test Mode Payment Link for payment recovery.",
          },
          include: {
            recoveryEvents: {
              orderBy: {
                createdAt: "desc",
              },
              take: 20,
            },
          },
        });

      return NextResponse.json({
        success: true,
        executed: true,
        action: "PAYMENT_LINK",

        /*
         * This is a real Razorpay Test Mode object.
         */
        simulation: false,
        mode: "RAZORPAY_TEST",

        paymentLinkCreated: true,

        paymentLink: {
          id: paymentLink.id,
          shortUrl: paymentLink.short_url,
          status: paymentLink.status,
          amount: paymentLink.amount,
          currency: paymentLink.currency,
          expireBy: paymentLink.expire_by,
        },

        event,
        transaction: updated,

        message:
          "Real Razorpay Test Mode Payment Link created successfully.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unsupported recovery action.",
      },
      { status: 400 },
    );
  } catch (error: any) {
    console.error(
      "RECOVR /api/recovery/execute error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.error?.description ||
          error?.description ||
          error?.message ||
          "Failed to execute recovery action.",
      },
      { status: 500 },
    );
  }
}