import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const transactionId = body.transactionId?.trim();
    const paymentId = body.paymentId?.trim();

    if (!transactionId || !paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: "transactionId and paymentId are required.",
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

    const recoveredAmount = transaction.amount;

    const updated = await prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        razorpayPaymentId: paymentId,

        recovered: true,

        recoveredAmount,

        recoveredAt: new Date(),

        recoveryStatus: "RECOVERED",

        recoveryAction: "PAYMENT_LINK",

        recommendation: "PAYMENT_LINK",

        reason:
          "Razorpay Test Mode recovery payment was successfully captured.",
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

    const event = await prisma.recoveryEvent.create({
      data: {
        transactionId: transaction.id,
        eventType: "PAYMENT_RECOVERED",
        action: "PAYMENT_LINK",
        message:
          `Recovery payment successfully captured in Razorpay Test Mode: ${paymentId}`,
      },
    });

    return NextResponse.json({
      success: true,
      recovered: true,
      transaction: updated,
      event,
      message:
        "RECOVR transaction successfully marked as recovered.",
    });
  } catch (error) {
    console.error(
      "RECOVR /api/test/recover-transaction error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark transaction as recovered.",
      },
      { status: 500 }
    );
  }
}