import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  try {
    const transaction = await prisma.transaction.create({
      data: {
        paymentId: `pay_test_${Date.now()}`,
        customerEmail: "test@recovr.com",
        amount: 100,
        currency: "INR",
        status: "FAILED",
        failureReason: "INSUFFICIENT_FUNDS",
        recoverable: true,
        recoveryStatus: "PENDING",
        recommendation: "PAYMENT_LINK",
        confidence: 0.95,
        reason: "Test payment failed and is eligible for RECOVR recovery.",
      },
    });

    await prisma.paymentEvent.create({
      data: {
        transactionId: transaction.id,
        eventType: "PAYMENT_FAILED",
        channel: "CARD",
        provider: "RAZORPAY",
        status: "FAILED",
        failureCode: "INSUFFICIENT_FUNDS",
        latencyMs: 850,
        amount: 100,
        currency: "INR",
      },
    });

    await prisma.recoveryEvent.create({
      data: {
        transactionId: transaction.id,
        eventType: "PAYMENT_FAILED",
        action: "DETECT",
        message: "Test failed payment created for RECOVR recovery.",
      },
    });

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("CREATE TEST TRANSACTION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create test transaction.",
      },
      { status: 500 }
    );
  }
}