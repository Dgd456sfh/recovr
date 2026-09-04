import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { razorpay } from "@/lib/razorpay/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const transactionId = body.transactionId?.trim();

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: "transactionId is required.",
        },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.findUnique({
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
        { status: 404 }
      );
    }

    if (!transaction.razorpayPaymentLinkId) {
      return NextResponse.json(
        {
          success: false,
          error: "No Razorpay Payment Link found for this transaction.",
        },
        { status: 404 }
      );
    }

    /*
     * Fetch the REAL Payment Link from Razorpay Test Mode.
     */
    const paymentLink = await razorpay.paymentLink.fetch(
      transaction.razorpayPaymentLinkId
    );

    /*
     * Razorpay Payment Link status:
     * created / partially_paid / paid / expired / cancelled
     */

    const isPaid =
      paymentLink.status === "paid";

    if (isPaid) {
      const recoveredAmount =
        Number(paymentLink.amount_paid || 0) / 100;

      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            recovered: true,
            recoveredAmount:
              recoveredAmount || transaction.amount,
            recoveredAt: new Date(),

            status: "RECOVERED",

            recoveryStatus:
              "RECOVERED",

            recoveryAction:
              "PAYMENT_LINK",

            recommendation:
              "PAYMENT_LINK",

            reason:
              "Customer successfully completed the RECOVR Razorpay Test Mode Payment Link.",
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
       * Add recovery audit event.
       */
      await prisma.recoveryEvent.create({
        data: {
          transactionId:
            transaction.id,

          eventType:
            "PAYMENT_RECOVERED",

          action:
            "PAYMENT_LINK",

          message:
            `RECOVR confirmed successful Payment Link payment: ${paymentLink.id}`,
        },
      });

      return NextResponse.json({
        success: true,
        recovered: true,
        paymentLink: {
          id: paymentLink.id,
          status: paymentLink.status,
          amount: paymentLink.amount,
          amountPaid: paymentLink.amount_paid,
          currency: paymentLink.currency,
          shortUrl: paymentLink.short_url,
        },
        transaction: updated,
        message:
          "Recovery confirmed successfully.",
      });
    }

    /*
     * Payment is not completed yet.
     */
    return NextResponse.json({
      success: true,
      recovered: false,

      paymentLink: {
        id: paymentLink.id,
        status: paymentLink.status,
        amount: paymentLink.amount,
        amountPaid: paymentLink.amount_paid,
        currency: paymentLink.currency,
        shortUrl: paymentLink.short_url,
      },

      transaction,

      message:
        `Payment Link status is ${paymentLink.status}. Recovery is not confirmed yet.`,
    });
  } catch (error: unknown) {
    console.error(
      "RECOVR /api/razorpay/sync-payment-link error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to sync Razorpay Payment Link.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}