import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string | null;
        amount?: number;
        currency?: string;
        status?: string;
        email?: string;
        contact?: string;
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity?: {
        id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        notes?: Record<string, string>;
      };
    };
    payment_link?: {
      entity?: {
        id?: string;
        short_url?: string;
        status?: string;
        amount?: number;
        currency?: string;
        reference_id?: string;
      };
    };
  };
};

function getWebhookSecret() {
  return (
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.RAZORPAY_WEBHOOK_SECRET_KEY ||
    ""
  );
}

function verifySignature(
  rawBody: string,
  signature: string,
  secret: string
) {
  if (!signature || !secret) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

function extractRecovrTransactionId(
  payload: RazorpayWebhookPayload
) {
  const payment =
    payload.payload?.payment?.entity;

  const paymentLink =
    payload.payload?.payment_link?.entity;

  const paymentNotes =
    payment?.notes || {};

  const paymentLinkReference =
    paymentLink?.reference_id || "";

  const noteTransactionId =
    paymentNotes.recovrTransactionId ||
    paymentNotes.transactionId ||
    "";

  if (noteTransactionId) {
    return noteTransactionId;
  }

  if (
    paymentLinkReference.startsWith(
      "recovr_"
    )
  ) {
    return paymentLinkReference.replace(
      "recovr_",
      ""
    );
  }

  return null;
}

async function markTransactionRecovered(
  transactionId: string,
  paymentId: string | null,
  razorpayOrderId: string | null,
  razorpayPaymentLinkId: string | null
) {
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
    return null;
  }

  if (transaction.recovered) {
    return transaction;
  }

  const updated =
    await prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        recovered: true,

        recoveryStatus:
          "RECOVERED",

        recoveryAction:
          "MARK_RECOVERED",

        recommendation:
          "NO_ACTION",

        recoveredAt:
          new Date(),

        razorpayPaymentId:
          paymentId || undefined,

        razorpayOrderId:
          razorpayOrderId || undefined,

        razorpayPaymentLinkId:
          razorpayPaymentLinkId ||
          undefined,

        reason:
          "Razorpay confirmed successful payment for a RECOVR recovery attempt.",
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

  await prisma.recoveryEvent.create({
    data: {
      transactionId:
        transaction.id,

      eventType:
        "PAYMENT_RECOVERED",

      action:
        "MARK_RECOVERED",

      message:
        `Razorpay confirmed successful recovery${
          paymentId
            ? ` for payment ${paymentId}`
            : ""
        }.`,
    },
  });

  return updated;
}

export async function POST(
  request: Request
) {
  try {
    const rawBody =
      await request.text();

    const signature =
      request.headers.get(
        "x-razorpay-signature"
      ) || "";

    const webhookSecret =
      getWebhookSecret();

    /*
     * Signature verification is mandatory
     * when a webhook secret has been configured.
     */
    if (webhookSecret) {
      const valid =
        verifySignature(
          rawBody,
          signature,
          webhookSecret
        );

      if (!valid) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid Razorpay webhook signature.",
          },
          {
            status: 401,
          }
        );
      }
    }

    let payload: RazorpayWebhookPayload;

    try {
      payload =
        JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const event =
      payload.event || "";

    console.log(
      "RECOVR Razorpay webhook:",
      event
    );

    /*
     * =====================================================
     * PAYMENT LINK PAID
     * =====================================================
     */

    if (
      event ===
      "payment_link.paid"
    ) {
      const paymentLink =
        payload.payload?.payment_link
          ?.entity;

      const payment =
        payload.payload?.payment
          ?.entity;

      const transactionId =
        extractRecovrTransactionId(
          payload
        );

      if (!transactionId) {
        console.warn(
          "RECOVR: payment_link.paid received without RECOVR transaction reference."
        );

        return NextResponse.json({
          success: true,
          handled: false,
          event,
          message:
            "Payment Link payment received, but no RECOVR transaction reference was found.",
        });
      }

      const updated =
        await markTransactionRecovered(
          transactionId,

          payment?.id || null,

          payment?.order_id || null,

          paymentLink?.id || null
        );

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            error:
              "RECOVR transaction not found.",
            transactionId,
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json({
        success: true,

        handled: true,

        event,

        recovered: true,

        transactionId,

        paymentId:
          payment?.id || null,

        paymentLinkId:
          paymentLink?.id || null,

        transaction:
          updated,

        message:
          "RECOVR transaction automatically marked as RECOVERED.",
      });
    }

    /*
     * =====================================================
     * PAYMENT CAPTURED
     * =====================================================
     *
     * This handles normal Razorpay payment
     * success events as well.
     */

    if (
      event ===
        "payment.captured" ||
      event ===
        "payment.authorized"
    ) {
      const payment =
        payload.payload?.payment
          ?.entity;

      const transactionId =
        extractRecovrTransactionId(
          payload
        );

      if (!transactionId) {
        return NextResponse.json({
          success: true,
          handled: false,
          event,
          message:
            "Payment event received without a RECOVR transaction reference.",
        });
      }

      const updated =
        await markTransactionRecovered(
          transactionId,

          payment?.id || null,

          payment?.order_id || null,

          null
        );

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            error:
              "RECOVR transaction not found.",
            transactionId,
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json({
        success: true,

        handled: true,

        event,

        recovered: true,

        transactionId,

        paymentId:
          payment?.id || null,

        transaction:
          updated,

        message:
          "RECOVR transaction automatically marked as RECOVERED.",
      });
    }

    /*
     * =====================================================
     * PAYMENT FAILED
     * =====================================================
     */

    if (
      event ===
        "payment.failed"
    ) {
      const payment =
        payload.payload?.payment
          ?.entity;

      const transactionId =
        extractRecovrTransactionId(
          payload
        );

      if (!transactionId) {
        return NextResponse.json({
          success: true,
          handled: false,
          event,
          message:
            "Payment failure received without a RECOVR transaction reference.",
        });
      }

      await prisma.recoveryEvent.create({
        data: {
          transactionId,

          eventType:
            "RECOVERY_PAYMENT_FAILED",

          action:
            "NO_ACTION",

          message:
            `Razorpay reported a failed recovery payment${
              payment?.id
                ? ` (${payment.id})`
                : ""
            }.`,
        },
      });

      return NextResponse.json({
        success: true,

        handled: true,

        event,

        recovered: false,

        transactionId,

        message:
          "Recovery payment failure recorded by RECOVR.",
      });
    }

    /*
     * =====================================================
     * ALL OTHER EVENTS
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      handled: false,

      event,

      message:
        "Razorpay webhook received.",
    });
  } catch (error: unknown) {
    console.error(
      "RECOVR Razorpay webhook error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}