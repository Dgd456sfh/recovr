import { razorpay } from "@/lib/razorpay/client";

export type CreateRecoveryPaymentLinkInput = {
  amount: number;
  currency?: string;
  description?: string;
  customerEmail?: string;
  referenceId?: string;
};

export async function createRecoveryPaymentLink(
  input: CreateRecoveryPaymentLinkInput
) {
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("A valid recovery amount is required.");
  }

  const paymentLink = await razorpay.paymentLink.create({
    amount: Math.round(amount * 100),
    currency: input.currency || "INR",
    description: input.description || "RECOVR payment recovery",
    customer: input.customerEmail
      ? {
          email: input.customerEmail,
        }
      : undefined,
    reference_id: input.referenceId,
    callback_url: process.env.RECOVR_CALLBACK_URL,
    callback_method: "get",
    expire_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  });

  return paymentLink;
}
