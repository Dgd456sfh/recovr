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

function normalizeAction(
  value: unknown
): RecoveryAction | null {
  if (typeof value !== "string") {
    return null;
  }

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
  recommendation: unknown
): RecoveryAction | null {
  return (
    normalizeAction(recoveryAction) ??
    normalizeAction(recommendation)
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as ExecuteRequest;

    const transactionId =
      body.transactionId?.trim();

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: "transactionId is required.",
        },
        { status: 400 }
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
        { status: 404 }
      );
    }

    /*
     * Do not execute another recovery action
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
      transaction.recommendation
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
        { status: 400 }
      );
    }

    /*
     * =========================================================
     * NO ACTION
     * =========================================================
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
     * =========================================================
     * CONTROLLED RETRY
     * =========================================================
     */

    if (action === "CONTROLLED_RETRY") {
      const event =
        await prisma.recoveryEvent.create({
          data: {
            transactionId: transaction.id,
            eventType: "RECOVERY_ATTEMPT",
            action: "CONTROLLED_RETRY",
            message:
              "RECOVR approved a controlled retry. A new Razorpay checkout attempt will be created.",
          },
        });

      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            recoveryStatus:
              "RETRY_SCHEDULED",
            recoveryAction:
              "CONTROLLED_RETRY",
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
          "Controlled retry approved. A new Razorpay checkout attempt will be used.",
      });
    }

    /*
     * =========================================================
     * REAL RAZORPAY TEST MODE PAYMENT LINK
     * =========================================================
     */

    if (action === "PAYMENT_LINK") {
      /*
       * If a Payment Link already exists in the database,
       * don't create another one.
       */
      if (
        transaction.razorpayPaymentLinkId
      ) {
        return NextResponse.json({
          success: true,
          executed: false,
          alreadyExists: true,
          action: "PAYMENT_LINK",
          paymentLinkCreated: false,
          paymentLink: {
            id:
              transaction.razorpayPaymentLinkId,
            shortUrl: null,
          },
          transaction,
          message:
            "A Razorpay Payment Link already exists for this recovery case.",
        });
      }

      /*
       * Create a REAL Razorpay Test Mode Payment Link.
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
       * IMPORTANT:
       *
       * Save the actual Razorpay Payment Link ID
       * directly into Transaction.
       *
       * This fixes the "No Razorpay Payment Link was
       * found for this recovery case" error.
       */
      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            razorpayPaymentLinkId:
              paymentLink.id,

            recoveryStatus:
              "PAYMENT_LINK_GENERATED",

            recoveryAction:
              "PAYMENT_LINK",

            recommendation:
              "PAYMENT_LINK",

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

      /*
       * Save an audit event.
       */
      const event =
        await prisma.recoveryEvent.create({
          data: {
            transactionId:
              transaction.id,

            eventType:
              "PAYMENT_LINK_CREATED",

            action:
              "PAYMENT_LINK",

            message:
              `Real Razorpay Test Mode Payment Link created: ${paymentLink.id} (${paymentLink.short_url})`,
          },
        });

      return NextResponse.json({
        success: true,

        executed: true,

        action: "PAYMENT_LINK",

        simulation: false,

        mode: "RAZORPAY_TEST",

        paymentLinkCreated: true,

        paymentLink: {
          id: paymentLink.id,
          shortUrl:
            paymentLink.short_url,
          status:
            paymentLink.status,
          amount:
            paymentLink.amount,
          currency:
            paymentLink.currency,
          expireBy:
            paymentLink.expire_by,
        },

        event,

        transaction: updated,

        message:
          "Real Razorpay Test Mode Payment Link created successfully.",
      });
    }

    /*
     * This should never normally be reached.
     */

    return NextResponse.json(
      {
        success: false,
        error:
          "Unsupported recovery action.",
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error(
      "RECOVR /api/recovery/execute error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to execute recovery action.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}