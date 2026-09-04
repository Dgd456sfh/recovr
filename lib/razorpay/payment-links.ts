type CreateRecoveryPaymentLinkInput = {
  amount: number;
  currency: string;
  description: string;
  customerEmail?: string | null;
  referenceId: string;
};

type RazorpayPaymentLinkResponse = {
  id: string;
  short_url: string;
  status: string;
  amount: number;
  currency: string;
  expire_by?: number | null;
};

function getRazorpayCredentials() {
  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    "";

  const keySecret =
    process.env.RAZORPAY_KEY_SECRET ||
    "";

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local."
    );
  }

  return {
    keyId,
    keySecret,
  };
}

export async function createRecoveryPaymentLink(
  input: CreateRecoveryPaymentLinkInput
): Promise<RazorpayPaymentLinkResponse> {
  const {
    keyId,
    keySecret,
  } =
    getRazorpayCredentials();

  const amountInPaise =
    Math.round(
      input.amount * 100
    );

  if (
    !Number.isFinite(
      amountInPaise
    ) ||
    amountInPaise <= 0
  ) {
    throw new Error(
      "Invalid Razorpay payment amount."
    );
  }

  const auth =
    Buffer.from(
      `${keyId}:${keySecret}`
    ).toString("base64");

  const response =
    await fetch(
      "https://api.razorpay.com/v1/payment_links",
      {
        method: "POST",

        headers: {
          Authorization:
            `Basic ${auth}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          amount:
            amountInPaise,

          currency:
            input.currency ||
            "INR",

          accept_partial:
            false,

          description:
            input.description,

          reference_id:
            input.referenceId,

          customer:
            input.customerEmail
              ? {
                  email:
                    input.customerEmail,
                }
              : undefined,

          notify:
            {
              email: true,
              sms: false,
            },

          reminder_enable:
            true,

          notes: {
            recovrTransactionId:
              input.referenceId.replace(
                /^recovr_/,
                ""
              ),

            source:
              "RECOVR",

            recovery:
              "REVENUE_RECOVERY",
          },
        }),
      }
    );

  const data =
    (await response.json()) as
      | RazorpayPaymentLinkResponse
      | {
          error?: {
            description?: string;
          };
        };

  if (!response.ok) {
    const errorMessage =
      "error" in data &&
      data.error?.description
        ? data.error.description
        : "Razorpay Payment Link creation failed.";

    throw new Error(
      errorMessage
    );
  }

  return data as RazorpayPaymentLinkResponse;
}