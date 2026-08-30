import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay/client";

export async function GET() {
  try {
    const orders = await razorpay.orders.all({
      count: 1,
    });

    return NextResponse.json({
      success: true,
      connected: true,
      message: "RECOVR is connected to Razorpay Test Mode.",
      orders: orders.items,
    });
  } catch (error: any) {
    console.error("RAZORPAY FULL ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: error?.error?.description || error?.description || error?.message || String(error),
        code: error?.error?.code || error?.code || null,
      },
      { status: 500 }
    );
  }
}