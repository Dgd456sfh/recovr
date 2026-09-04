import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const amount = Number(body.amount) || 2000;
    const customerEmail =
      body.customerEmail || "demo@recovr.com";

    const failureReason =
      body.failureReason || "INSUFFICIENT_FUNDS";

    const transaction = await prisma.transaction.create({
      data: {
        paymentId: `pay_demo_${Date.now()}`,
        customerEmail,
        amount,
        currency: "INR",

        status: "FAILED",
        failureReason,

        recoverable: true,
        recovered: false,

        recoveryStatus: "PENDING",
        recoveryAction: null,

        recommendation: "PAYMENT_LINK",
        confidence: 0.95,

        reason:
          "Demo failed payment created for RECOVR recovery.",

        recoveredAmount: null,
        recoveredAt: null,
      },
    });

    await prisma.recoveryEvent.create({
      data: {
        transactionId: transaction.id,
        eventType: "PAYMENT_FAILED",
        action: "DETECT",
        message:
          "Demo failed payment created for RECOVR recovery.",
      },
    });

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error(
      "POST /api/demo/transaction error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create demo transaction.",
      },
      {
        status: 500,
      }
    );
  }
}