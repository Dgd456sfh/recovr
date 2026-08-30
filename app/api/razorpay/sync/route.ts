import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { razorpay } from "@/lib/razorpay/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const orderId = body.orderId;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "orderId is required.",
        },
        { status: 400 }
      );
    }

    const order = await razorpay.orders.fetch(orderId);

    const existing = await prisma.transaction.findFirst({
      where: {
        paymentId: order.id,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        created: false,
        message: "Razorpay order already exists in RECOVR.",
        transaction: existing,
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        paymentId: order.id,
        customerEmail: "demo.customer@example.com",
        amount: Number(order.amount) / 100,
        currency: order.currency,
        status: "PENDING",
        recoverable: false,
        recoveryStatus: "PENDING",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Razorpay Test Mode order imported into RECOVR.",
      },
    });

    return NextResponse.json({
      success: true,
      created: true,
      message: "Razorpay order synced into RECOVR.",
      transaction,
    });
  } catch (error: any) {
    console.error("Razorpay sync error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.error?.description ||
          error?.description ||
          error?.message ||
          "Failed to sync Razorpay order.",
      },
      { status: 500 }
    );
  }
}