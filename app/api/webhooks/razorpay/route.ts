import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string
) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

function getFailureReason(payment: any) {
  return (
    payment.error_description ||
    payment.error_reason ||
    payment.error_code ||
    "Unknown payment failure"
  );
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const signature = req.headers.get("x-razorpay-signature");
    const eventId =
      req.headers.get("x-razorpay-event-id") ||
      req.headers.get("x-razorpay-request-id");

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is missing");

      return NextResponse.json(
        {
          success: false,
          error: "Webhook secret is not configured",
        },
        { status: 500 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing x-razorpay-signature",
        },
        { status: 400 }
      );
    }

    let validSignature = false;

    try {
      validSignature = verifyRazorpaySignature(
        rawBody,
        signature,
        secret
      );
    } catch {
      validSignature = false;
    }

    if (!validSignature) {
      console.warn("Invalid Razorpay webhook signature");

      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook signature",
        },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    const event = payload.event;

    console.log("Razorpay webhook received:", event);

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing event",
        },
        { status: 400 }
      );
    }

    /*
     * payment.failed
     */
    if (event === "payment.failed") {
      const payment = payload.payload?.payment?.entity;

      if (!payment?.id) {
        return NextResponse.json(
          {
            success: false,
            error: "Payment entity missing",
          },
          { status: 400 }
        );
      }

      const paymentId = payment.id;

      const amount = Number(payment.amount || 0) / 100;

      const currency = payment.currency || "INR";

      const customerEmail =
        payment.email ||
        payment.contact ||
        "unknown@example.com";

      const failureReason = getFailureReason(payment);

      /*
       * Idempotency:
       * If the same payment already exists, update it instead
       * of creating another transaction.
       */
      let transaction = await prisma.transaction.findUnique({
        where: {
          paymentId,
        },
      });

      if (!transaction) {
        transaction = await prisma.transaction.create({
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
        transaction = await prisma.transaction.update({
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

      /*
       * Save payment event.
       */
      await prisma.paymentEvent.create({
        data: {
          transactionId: transaction.id,
          eventType: "payment.failed",
          channel: payment.method || null,
          provider: payment.bank || payment.wallet || null,
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

      /*
       * Recovery audit event.
       */
      await prisma.recoveryEvent.create({
        data: {
          transactionId: transaction.id,
          eventType: "PAYMENT_FAILED",
          action: "RECOVERY_EVALUATION_REQUIRED",
          message: `Razorpay payment failed: ${failureReason}`,
        },
      });

      console.log(
        `RECOVR: failed payment captured ${paymentId} ₹${amount}`
      );

      return NextResponse.json({
        success: true,
        event: "payment.failed",
        transactionId: transaction.id,
        paymentId,
        amount,
        failureReason,
      });
    }

    /*
     * payment.captured
     */
    if (event === "payment.captured") {
      const payment = payload.payload?.payment?.entity;

      if (!payment?.id) {
        return NextResponse.json(
          {
            success: false,
            error: "Payment entity missing",
          },
          { status: 400 }
        );
      }

      const paymentId = payment.id;

      const amount = Number(payment.amount || 0) / 100;

      const transaction = await prisma.transaction.findUnique({
        where: {
          paymentId,
        },
      });

      /*
       * A captured payment may exist without a previous
       * failed event.
       */
      if (!transaction) {
        const created = await prisma.transaction.create({
          data: {
            paymentId,
            customerEmail:
              payment.email ||
              payment.contact ||
              "unknown@example.com",
            amount,
            currency: payment.currency || "INR",
            status: "CAPTURED",
            recoverable: false,
            recovered: false,
          },
        });

        await prisma.paymentEvent.create({
          data: {
            transactionId: created.id,
            eventType: "payment.captured",
            channel: payment.method || null,
            provider: payment.bank || payment.wallet || null,
            status: "CAPTURED",
            amount,
            currency: payment.currency || "INR",
          },
        });

        return NextResponse.json({
          success: true,
          event: "payment.captured",
          paymentId,
          transactionId: created.id,
          recovered: false,
        });
      }

      /*
       * If this payment was previously failed,
       * this becomes an actual recovery.
       */
      const wasFailed = transaction.status === "FAILED";

      const updated = await prisma.transaction.update({
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
          channel: payment.method || null,
          provider: payment.bank || payment.wallet || null,
          status: "CAPTURED",
          amount,
          currency: payment.currency || "INR",
        },
      });

      if (wasFailed) {
        await prisma.recoveryEvent.create({
          data: {
            transactionId: updated.id,
            eventType: "PAYMENT_RECOVERED",
            action: "RECOVERED",
            message: `Payment recovered through Razorpay capture: ₹${amount}`,
          },
        });
      }

      console.log(
        wasFailed
          ? `RECOVR: PAYMENT RECOVERED ${paymentId} ₹${amount}`
          : `RECOVR: payment captured ${paymentId} ₹${amount}`
      );

      return NextResponse.json({
        success: true,
        event: "payment.captured",
        paymentId,
        transactionId: updated.id,
        recovered: wasFailed,
        recoveredAmount: wasFailed ? amount : 0,
      });
    }

    /*
     * Other Razorpay events are accepted but ignored.
     */
    return NextResponse.json({
      success: true,
      received: true,
      event,
      handled: false,
    });
  } catch (error) {
    console.error("RECOVR Razorpay webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}