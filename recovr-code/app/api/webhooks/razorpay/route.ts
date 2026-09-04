import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getFailureReason(payment: any): string {
  return (
    payment?.error_description ||
    payment?.error_reason ||
    payment?.error_code ||
    "Unknown payment failure"
  );
}

function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature),
  );
}

export async function POST(request: Request) {
  try {
    /*
     * IMPORTANT:
     * Razorpay signature verification must use the
     * original raw request body.
     */
    const rawBody = await request.text();

    const signature = request.headers.get(
      "x-razorpay-signature",
    );

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("RECOVR: Invalid Razorpay webhook signature.");

      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook signature",
        },
        { status: 401 },
      );
    }

    const payload = JSON.parse(rawBody);
    const event = payload?.event;

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing event",
        },
        { status: 400 },
      );
    }

    console.log(`RECOVR WEBHOOK: ${event}`);

    /*
     * =========================================================
     * PAYMENT LINK PAID
     *
     * This is the critical RECOVR recovery event.
     * =========================================================
     */
    if (event === "payment_link.paid") {
      const paymentLink =
        payload.payload?.payment_link?.entity;

      const payment =
        payload.payload?.payment?.entity;

      if (!paymentLink?.id) {
        return NextResponse.json(
          {
            success: false,
            error: "Payment Link entity missing",
          },
          { status: 400 },
        );
      }

      const paymentLinkId = paymentLink.id;

      const referenceId =
        paymentLink.reference_id;

      const paymentId =
        payment?.id || null;

      const amount =
        Number(
          payment?.amount ||
            paymentLink.amount_paid ||
            paymentLink.amount ||
            0,
        ) / 100;

      const currency =
        payment?.currency ||
        paymentLink.currency ||
        "INR";

      /*
       * Our recovery executor creates:
       *
       * reference_id = recovr_<transactionId>
       *
       * Therefore we can directly recover the
       * original failed transaction.
       */
      let transactionId: string | null = null;

      if (
        typeof referenceId === "string" &&
        referenceId.startsWith("recovr_")
      ) {
        transactionId =
          referenceId.slice("recovr_".length);
      }

      let transaction = transactionId
        ? await prisma.transaction.findUnique({
            where: {
              id: transactionId,
            },
          })
        : null;

      /*
       * Fallback:
       * If reference_id doesn't map to a transaction,
       * search recovery events for the Payment Link ID.
       */
      if (!transaction) {
        const eventMatch =
          await prisma.recoveryEvent.findFirst({
            where: {
              message: {
                contains: paymentLinkId,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          });

        if (eventMatch) {
          transaction =
            await prisma.transaction.findUnique({
              where: {
                id: eventMatch.transactionId,
              },
            });
        }
      }

      /*
       * Unknown Payment Link.
       *
       * Do NOT invent a transaction.
       */
      if (!transaction) {
        console.warn(
          "RECOVR: Payment Link paid but no RECOVR transaction matched.",
          {
            paymentLinkId,
            referenceId,
            paymentId,
          },
        );

        return NextResponse.json({
          success: true,
          event,
          handled: false,
          reason:
            "Payment Link was paid but no RECOVR transaction could be matched.",
          paymentLinkId,
          referenceId,
          paymentId,
        });
      }

      /*
       * Idempotency:
       * If RECOVR already marked this transaction recovered,
       * don't create duplicate recovery events.
       */
      if (transaction.recovered) {
        return NextResponse.json({
          success: true,
          event,
          handled: true,
          alreadyRecovered: true,
          transactionId: transaction.id,
          paymentLinkId,
          paymentId,
        });
      }

      /*
       * Update the original failed transaction.
       *
       * IMPORTANT:
       * The original paymentId remains intact because it
       * identifies the failed payment that RECOVR recovered.
       */
      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            status: "CAPTURED",
            recovered: true,
            recoveredAmount: amount,
            recoveredAt: new Date(),
            recoveryStatus: "RECOVERED",
            recoveryAction: "PAYMENT_LINK",
            recommendation: "PAYMENT_LINK",
            reason:
              "Payment successfully recovered through a Razorpay Payment Link.",
          },
        });

      /*
       * Save the successful recovery payment event.
       */
      await prisma.paymentEvent.create({
        data: {
          transactionId: updated.id,
          eventType: "payment_link.paid",
          channel:
            payment?.method ||
            "PAYMENT_LINK",
          provider:
            payment?.bank ||
            payment?.wallet ||
            "RAZORPAY",
          status: "CAPTURED",
          failureCode: null,
          latencyMs: null,
          amount,
          currency,
        },
      });

      /*
       * Save RECOVR audit event.
       */
      await prisma.recoveryEvent.create({
        data: {
          transactionId: updated.id,
          eventType: "PAYMENT_RECOVERED",
          action: "RECOVERED",
          message:
            `RECOVR recovered ₹${amount.toFixed(
              2,
            )} through Razorpay Payment Link ` +
            `${paymentLinkId}. ` +
            `Payment ID: ${paymentId || "unknown"}.`,
        },
      });

      console.log(
        `RECOVR: PAYMENT LINK RECOVERED ` +
          `${updated.paymentId} ₹${amount}`,
      );

      return NextResponse.json({
        success: true,
        event,
        handled: true,
        recovered: true,
        transactionId: updated.id,
        originalPaymentId: updated.paymentId,
        recoveryPaymentId: paymentId,
        paymentLinkId,
        referenceId,
        recoveredAmount: amount,
        currency,
        recoveryStatus: "RECOVERED",
      });
    }

    /*
     * =========================================================
     * PAYMENT FAILED
     * =========================================================
     */
    if (event === "payment.failed") {
      const payment =
        payload.payload?.payment?.entity;

      if (!payment?.id) {
        return NextResponse.json(
          {
            success: false,
            error: "Payment entity missing",
          },
          { status: 400 },
        );
      }

      const paymentId = payment.id;

      const amount =
        Number(payment.amount || 0) / 100;

      const currency =
        payment.currency || "INR";

      const customerEmail =
        payment.email ||
        payment.contact ||
        "unknown@example.com";

      const failureReason =
        getFailureReason(payment);

      let transaction =
        await prisma.transaction.findUnique({
          where: {
            paymentId,
          },
        });

      if (!transaction) {
        transaction =
          await prisma.transaction.create({
            data: {
              paymentId,
              customerEmail,
              amount,
              currency,
              status: "FAILED",
              failureReason,
              recoverable: true,
              recoveryStatus: "PENDING",
            },
          });
      } else {
        transaction =
          await prisma.transaction.update({
            where: {
              id: transaction.id,
            },
            data: {
              status: "FAILED",
              failureReason,
              recoverable: true,
            },
          });
      }

      await prisma.paymentEvent.create({
        data: {
          transactionId: transaction.id,
          eventType: "payment.failed",
          channel: payment.method || null,
          provider:
            payment.bank ||
            payment.wallet ||
            null,
          status: "FAILED",
          failureCode:
            payment.error_code ||
            payment.error_reason ||
            null,
          latencyMs: null,
          amount,
          currency,
        },
      });

      await prisma.recoveryEvent.create({
        data: {
          transactionId: transaction.id,
          eventType: "PAYMENT_FAILED",
          action:
            "RECOVERY_EVALUATION_REQUIRED",
          message:
            `Razorpay payment failed: ${failureReason}`,
        },
      });

      console.log(
        `RECOVR: payment failed ${paymentId} ₹${amount}`,
      );

      return NextResponse.json({
        success: true,
        event,
        transactionId: transaction.id,
        paymentId,
        amount,
        failureReason,
      });
    }

    /*
     * =========================================================
     * PAYMENT CAPTURED
     *
     * Handles normal Razorpay payments.
     * Payment Link recovery is handled above through
     * payment_link.paid.
     * =========================================================
     */
    if (event === "payment.captured") {
      const payment =
        payload.payload?.payment?.entity;

      if (!payment?.id) {
        return NextResponse.json(
          {
            success: false,
            error: "Payment entity missing",
          },
          { status: 400 },
        );
      }

      const paymentId = payment.id;

      const amount =
        Number(payment.amount || 0) / 100;

      const currency =
        payment.currency || "INR";

      const transaction =
        await prisma.transaction.findUnique({
          where: {
            paymentId,
          },
        });

      /*
       * A captured payment that doesn't belong
       * to an existing RECOVR failed transaction.
       */
      if (!transaction) {
        const created =
          await prisma.transaction.create({
            data: {
              paymentId,
              customerEmail:
                payment.email ||
                payment.contact ||
                "unknown@example.com",
              amount,
              currency,
              status: "CAPTURED",
              recoverable: false,
              recovered: false,
            },
          });

        await prisma.paymentEvent.create({
          data: {
            transactionId: created.id,
            eventType: "payment.captured",
            channel:
              payment.method || null,
            provider:
              payment.bank ||
              payment.wallet ||
              null,
            status: "CAPTURED",
            amount,
            currency,
          },
        });

        return NextResponse.json({
          success: true,
          event,
          paymentId,
          transactionId: created.id,
          recovered: false,
        });
      }

      const wasFailed =
        transaction.status === "FAILED";

      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            status: "CAPTURED",

            ...(wasFailed
              ? {
                  recovered: true,
                  recoveredAmount: amount,
                  recoveredAt: new Date(),
                  recoveryStatus: "RECOVERED",
                }
              : {}),
          },
        });

      await prisma.paymentEvent.create({
        data: {
          transactionId: updated.id,
          eventType: "payment.captured",
          channel:
            payment.method || null,
          provider:
            payment.bank ||
            payment.wallet ||
            null,
          status: "CAPTURED",
          amount,
          currency,
        },
      });

      if (wasFailed) {
        await prisma.recoveryEvent.create({
          data: {
            transactionId: updated.id,
            eventType: "PAYMENT_RECOVERED",
            action: "RECOVERED",
            message:
              `Payment recovered through Razorpay capture: ₹${amount.toFixed(
                2,
              )}`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        event,
        paymentId,
        transactionId: updated.id,
        recovered: wasFailed,
        recoveredAmount:
          wasFailed ? amount : 0,
      });
    }

    /*
     * =========================================================
     * OTHER EVENTS
     * =========================================================
     */
    return NextResponse.json({
      success: true,
      received: true,
      event,
      handled: false,
    });
  } catch (error) {
    console.error(
      "RECOVR Razorpay webhook error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Webhook processing failed",
      },
      { status: 500 },
    );
  }
}