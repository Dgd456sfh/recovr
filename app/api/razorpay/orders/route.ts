import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { razorpay } from "@/lib/razorpay/client";

type CreateOrderRequest = {
  transactionId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderRequest;

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

    if (transaction.recovered) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction has already been recovered.",
        },
        { status: 409 }
      );
    }

    if (transaction.razorpayOrderId) {
      return NextResponse.json({
        success: true,
        existing: true,
        orderId: transaction.razorpayOrderId,
        transaction,
      });
    }

    const amount = Number(transaction.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid transaction amount.",
        },
        { status: 400 }
      );
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: transaction.currency || "INR",
      receipt: `recovr_${transaction.id}`,
      notes: {
        recovrTransactionId: transaction.id,
        originalPaymentId: transaction.paymentId,
        recoveryAction: "CONTROLLED_RETRY",
      },
    });

    const updated = await prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        razorpayOrderId: order.id,
        recoveryStatus: "RETRY_SCHEDULED",
        recoveryAction: "CONTROLLED_RETRY",
        recommendation: "RETRY",
        reason:
          "RECOVR created a new Razorpay Test Mode Order for a controlled recovery checkout.",
      },
    });

    await prisma.recoveryEvent.create({
      data: {
        transactionId: transaction.id,
        eventType: "RAZORPAY_ORDER_CREATED",
        action: "CONTROLLED_RETRY",
        message:
          `New Razorpay Test Mode Order created: ${order.id}`,
      },
    });

    return NextResponse.json({
      success: true,
      existing: false,
      mode: "RAZORPAY_TEST",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
      },
      transaction: updated,
      message:
        "New Razorpay Test Mode Order created successfully.",
    });
  } catch (error: any) {
    console.error(
      "RECOVR /api/razorpay/orders error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.error?.description ||
          error?.description ||
          error?.message ||
          "Failed to create Razorpay order.",
      },
      { status: 500 }
    );
  }
}