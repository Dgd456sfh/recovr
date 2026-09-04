import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const transactionId =
      typeof body?.transactionId === "string"
        ? body.transactionId.trim()
        : "";

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
          },
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: "Recovery case not found.",
        },
        { status: 404 }
      );
    }

    if (!transaction.recoverable) {
      return NextResponse.json(
        {
          success: false,
          error: "This transaction is not recoverable.",
        },
        { status: 400 }
      );
    }

    if (transaction.recovered) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transaction has already been recovered.",
        },
        { status: 400 }
      );
    }

    /*
     * Reuse existing Payment Link.
     */
    if (transaction.razorpayPaymentLinkId) {
      try {
        const existing =
          await razorpay.paymentLink.fetch(
            transaction.razorpayPaymentLinkId
          );

        return NextResponse.json({
          success: true,
          alreadyCreated: true,
          transactionId: transaction.id,
          paymentLinkId: existing.id,
          paymentLink:
            existing.short_url ?? null,
          shortUrl:
            existing.short_url ?? null,
          razorpayStatus:
            existing.status,
          amount: transaction.amount,
          currency: transaction.currency,
          recoveryStatus:
            transaction.recoveryStatus,
        });
      } catch (error) {
        console.warn(
          "Existing Payment Link unavailable. Creating new one.",
          error
        );
      }
    }

    const amountInPaise = Math.round(
      Number(transaction.amount) * 100
    );

    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaction amount must be greater than zero.",
        },
        { status: 400 }
      );
    }

    const referenceId =
      `recovr_${transaction.id}`;

    const callbackUrl =
      process.env.RECOVR_CALLBACK_URL ||
      "http://localhost:3000/recovery";

    const paymentLink =
      await razorpay.paymentLink.create({
        amount: amountInPaise,
        currency:
          transaction.currency || "INR",

        description:
          `RECOVR recovery for ${transaction.paymentId}`,

        reference_id: referenceId,

        customer: {
          email:
            transaction.customerEmail,
        },

        notify: {
          email: true,
        },

        callback_url: callbackUrl,

        callback_method: "get",
      });

    const updated =
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          razorpayPaymentLinkId:
            paymentLink.id,

          recoveryAction:
            "PAYMENT_LINK",

          recoveryStatus:
            "PAYMENT_LINK_GENERATED",

          recommendation:
            "PAYMENT_LINK",

          reason:
            "RECOVR created a real Razorpay Payment Link for recovery.",

          recoveryEvents: {
            create: {
              eventType:
                "PAYMENT_LINK_CREATED",

              action:
                "PAYMENT_LINK",

              message:
                `RECOVR created Razorpay Payment Link ${paymentLink.id} for ₹${Number(
                  transaction.amount
                ).toFixed(
                  2
                )}. Reference ID: ${referenceId}.`,
            },
          },
        },

        include: {
          recoveryEvents: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    return NextResponse.json({
      success: true,

      mode: "RAZORPAY_TEST",

      transactionId:
        updated.id,

      paymentLinkId:
        paymentLink.id,

      paymentLink:
        paymentLink.short_url ?? null,

      shortUrl:
        paymentLink.short_url ?? null,

      amount:
        transaction.amount,

      currency:
        transaction.currency,

      referenceId,

      razorpayStatus:
        paymentLink.status,

      recoveryStatus:
        updated.recoveryStatus,
    });
  } catch (error: any) {
    console.error(
      "RECOVR Payment Link creation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.error?.description ||
          error?.error?.reason ||
          error?.description ||
          error?.message ||
          "Failed to create Razorpay Payment Link.",
      },
      { status: 500 }
    );
  }
}