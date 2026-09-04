import { NextResponse } from "next/server";
import { razorpay, keyId } from "@/lib/razorpay/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const amount = Number(body.amount);

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid amount is required.",
        },
        { status: 400 }
      );
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `recovr_${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      order,
      keyId,
    });
  } catch (error: any) {
    console.error("Razorpay order creation error:", error);

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