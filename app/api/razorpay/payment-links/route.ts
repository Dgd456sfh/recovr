import { NextResponse } from "next/server";
import { createRecoveryPaymentLink } from "@/lib/razorpay/payment-links";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid amount is required.",
        },
        { status: 400 }
      );
    }

    const paymentLink = await createRecoveryPaymentLink({
      amount,
      currency: body.currency || "INR",
      description:
        body.description || "RECOVR payment recovery",
      customerEmail: body.customerEmail,
      referenceId: body.referenceId,
    });

    return NextResponse.json({
      success: true,
      mode: "RAZORPAY_TEST",
      paymentLink: {
        id: paymentLink.id,
        shortUrl: paymentLink.short_url,
        status: paymentLink.status,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        expireBy: paymentLink.expire_by,
      },
    });
  } catch (error: any) {
    console.error("RECOVR Payment Link error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.error?.description ||
          error?.description ||
          error?.message ||
          "Failed to create Razorpay Payment Link.",
      },
      { status: 500 }
    );
  }
}
