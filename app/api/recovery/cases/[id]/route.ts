import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getRecommendation(transaction: {
  recoveryAction: string | null;
  recommendation: string | null;
  failureReason: string | null;
  recoverable: boolean;
  recovered: boolean;
  status: string;
  reason: string | null;
  confidence: number | null;
}) {
  /*
   * RECOVERED
   */
  if (
    transaction.recovered ||
    transaction.status === "RECOVERED"
  ) {
    return {
      recommendation: "NO_ACTION",
      confidence: 100,
      reason:
        transaction.reason ||
        "Payment has already been successfully recovered.",
    };
  }

  /*
   * Existing recovery action takes priority.
   */
  const action =
    transaction.recoveryAction
      ?.trim()
      .toUpperCase();

  if (
    action === "PAYMENT_LINK" ||
    action === "PAYMENT_LINK_GENERATED"
  ) {
    return {
      recommendation: "PAYMENT_LINK",
      confidence:
        transaction.confidence ?? 84,
      reason:
        transaction.reason ||
        "The original payment method was declined or could not complete the payment. An alternative payment opportunity is recommended.",
    };
  }

  if (
    action === "RETRY" ||
    action === "CONTROLLED_RETRY"
  ) {
    return {
      recommendation: "RETRY",
      confidence:
        transaction.confidence ?? 91,
      reason:
        transaction.reason ||
        "A controlled retry is recommended for this payment failure.",
    };
  }

  if (action === "NO_ACTION") {
    return {
      recommendation: "NO_ACTION",
      confidence:
        transaction.confidence ?? 100,
      reason:
        transaction.reason ||
        "RECOVR determined that no recovery action should be executed.",
    };
  }

  /*
   * Existing recommendation.
   */
  const recommendation =
    transaction.recommendation
      ?.trim()
      .toUpperCase();

  if (
    recommendation === "PAYMENT_LINK" ||
    recommendation === "PAYMENT_LINK_GENERATED"
  ) {
    return {
      recommendation: "PAYMENT_LINK",
      confidence:
        transaction.confidence ?? 84,
      reason:
        transaction.reason ||
        "An alternative payment opportunity is recommended.",
    };
  }

  if (
    recommendation === "RETRY" ||
    recommendation === "CONTROLLED_RETRY"
  ) {
    return {
      recommendation: "RETRY",
      confidence:
        transaction.confidence ?? 91,
      reason:
        transaction.reason ||
        "A controlled retry is recommended for this payment failure.",
    };
  }

  if (recommendation === "NO_ACTION") {
    return {
      recommendation: "NO_ACTION",
      confidence:
        transaction.confidence ?? 100,
      reason:
        transaction.reason ||
        "No recovery action is required.",
    };
  }

  /*
   * Fallback from failure reason.
   */
  const failure =
    transaction.failureReason
      ?.toLowerCase() || "";

  if (
    failure.includes("timeout") ||
    failure.includes("network") ||
    failure.includes("temporary")
  ) {
    return {
      recommendation: "RETRY",
      confidence:
        transaction.confidence ?? 91,
      reason:
        transaction.reason ||
        "The payment failure appears temporary or network-related. A controlled retry is recommended.",
    };
  }

  if (
    failure.includes("insufficient") ||
    failure.includes("fund")
  ) {
    return {
      recommendation: "PAYMENT_LINK",
      confidence:
        transaction.confidence ?? 84,
      reason:
        transaction.reason ||
        "The payment failed because of insufficient funds. A Payment Link gives the customer another opportunity to complete the payment.",
    };
  }

  if (
    failure.includes("declined") ||
    failure.includes("card")
  ) {
    return {
      recommendation: "PAYMENT_LINK",
      confidence:
        transaction.confidence ?? 84,
      reason:
        transaction.reason ||
        "The original payment method was declined. An alternative payment opportunity is recommended.",
    };
  }

  if (!transaction.recoverable) {
    return {
      recommendation: "NO_ACTION",
      confidence: 0,
      reason:
        transaction.reason ||
        "This transaction does not require recovery.",
    };
  }

  return {
    recommendation: "PAYMENT_LINK",
    confidence:
      transaction.confidence ?? 70,
    reason:
      transaction.reason ||
      "An alternative payment recovery opportunity is recommended.",
  };
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const transactionId =
      typeof id === "string"
        ? id.trim()
        : "";

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * IMPORTANT:
     *
     * The /cases page sends the Prisma Transaction ID,
     * for example:
     *
     * cmtmiebfr0000fswbm175ozc1
     *
     * We therefore search by `id`, NOT paymentId.
     */
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

            take: 50,
          },

          paymentEvents: {
            orderBy: {
              createdAt: "desc",
            },

            take: 50,
          },
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Recovery case not found.",
        },
        {
          status: 404,
        }
      );
    }

    const decision =
      getRecommendation({
        recoveryAction:
          transaction.recoveryAction,

        recommendation:
          transaction.recommendation,

        failureReason:
          transaction.failureReason,

        recoverable:
          transaction.recoverable,

        recovered:
          transaction.recovered,

        status:
          transaction.status,

        reason:
          transaction.reason,

        confidence:
          transaction.confidence,
      });

    /*
     * Make sure the response contains everything
     * the frontend page expects.
     */
    const responseTransaction = {
      id: transaction.id,

      paymentId:
        transaction.paymentId,

      amount:
        transaction.amount,

      currency:
        transaction.currency,

      customerEmail:
        transaction.customerEmail,

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
        transaction.confidence ??
        decision.confidence,

      reason:
        transaction.reason ??
        decision.reason,

      createdAt:
        transaction.createdAt.toISOString(),

      updatedAt:
        transaction.updatedAt.toISOString(),

      /*
       * These fields are now present in your
       * current Prisma schema.
       */
      razorpayOrderId:
        transaction.razorpayOrderId ??
        null,

      razorpayPaymentLinkId:
        transaction.razorpayPaymentLinkId ??
        null,

      recoveryEvents:
        transaction.recoveryEvents.map(
          (event) => ({
            id: event.id,

            transactionId:
              event.transactionId,

            eventType:
              event.eventType,

            action:
              event.action,

            message:
              event.message,

            createdAt:
              event.createdAt.toISOString(),
          })
        ),

      paymentEvents:
        transaction.paymentEvents.map(
          (event) => ({
            id: event.id,

            transactionId:
              event.transactionId,

            eventType:
              event.eventType,

            channel:
              event.channel,

            provider:
              event.provider,

            status:
              event.status,

            failureCode:
              event.failureCode,

            latencyMs:
              event.latencyMs,

            amount:
              event.amount,

            currency:
              event.currency,

            createdAt:
              event.createdAt.toISOString(),
          })
        ),
    };

    return NextResponse.json({
      success: true,

      transaction:
        responseTransaction,

      /*
       * Convenience fields for debugging
       * and future frontend use.
       */
      recommendation:
        decision.recommendation,

      confidence:
        decision.confidence,

      reason:
        decision.reason,

      hasPaymentLink:
        Boolean(
          transaction.razorpayPaymentLinkId
        ),

      hasRazorpayOrder:
        Boolean(
          transaction.razorpayOrderId
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/recovery/cases/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load recovery case.",
      },
      {
        status: 500,
      }
    );
  }
}