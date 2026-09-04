import { GoogleGenAI } from "@google/genai";

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  return new GoogleGenAI({
    apiKey: key,
  });
}

export type AIRecoveryInput = {
  paymentId: string;
  customerEmail: string;
  amount: number;
  currency: string;
  failureReason: string | null;
  channel: string | null;
  provider: string | null;
  latencyMs: number | null;
  incidentSeverity: string | null;
  incidentConfidence: number | null;
  previousAttempts: number;
  previousRecoveries: number;
};

export type AIRecoveryDecision = {
  recommendedAction:
    | "RETRY"
    | "PAYMENT_LINK"
    | "WAIT"
    | "REVIEW";

  recoveryProbability: number;

  expectedRecoveredRevenue: number;

  confidence: number;

  risk: "LOW" | "MEDIUM" | "HIGH";

  reasoning: string;
};

/* =========================================================
   FALLBACK DECISION ENGINE
   ========================================================= */

function fallbackDecision(
  input: AIRecoveryInput
): AIRecoveryDecision {
  const reason =
    input.failureReason?.toLowerCase() ?? "";

  let recommendedAction:
    | "RETRY"
    | "PAYMENT_LINK"
    | "WAIT"
    | "REVIEW" = "REVIEW";

  let recoveryProbability = 0.45;

  let confidence = 0.65;

  let risk: "LOW" | "MEDIUM" | "HIGH" =
    "MEDIUM";

  /*
   * TEMPORARY / TECHNICAL FAILURE
   */

  if (
    reason.includes("timeout") ||
    reason.includes("network") ||
    reason.includes("temporary") ||
    reason.includes("gateway") ||
    reason.includes("connection")
  ) {
    recommendedAction = "RETRY";

    recoveryProbability = 0.82;

    confidence = 0.9;

    risk = "LOW";
  }

  /*
   * CUSTOMER / PAYMENT METHOD FAILURE
   */

  else if (
    reason.includes("insufficient") ||
    reason.includes("declined") ||
    reason.includes("expired") ||
    reason.includes("invalid")
  ) {
    recommendedAction = "PAYMENT_LINK";

    recoveryProbability = 0.7;

    confidence = 0.86;

    risk = "LOW";
  }

  /*
   * FRAUD / SECURITY
   */

  else if (
    reason.includes("fraud") ||
    reason.includes("risk") ||
    reason.includes("security") ||
    reason.includes("blocked")
  ) {
    recommendedAction = "REVIEW";

    recoveryProbability = 0.15;

    confidence = 0.95;

    risk = "HIGH";
  }

  /*
   * TOO MANY ATTEMPTS
   */

  if (input.previousAttempts >= 3) {
    recommendedAction = "WAIT";

    recoveryProbability *= 0.75;

    confidence = Math.max(
      confidence,
      0.8
    );
  }

  /*
   * ACTIVE CRITICAL INCIDENT
   */

  if (
    input.incidentSeverity === "CRITICAL" &&
    (input.incidentConfidence ?? 0) >= 0.8
  ) {
    recommendedAction = "WAIT";

    recoveryProbability *= 0.9;
  }

  /*
   * HISTORICAL SUCCESS
   */

  if (input.previousRecoveries > 0) {
    recoveryProbability = Math.min(
      0.95,
      recoveryProbability + 0.08
    );
  }

  recoveryProbability = Number(
    recoveryProbability.toFixed(4)
  );

  return {
    recommendedAction,

    recoveryProbability,

    expectedRecoveredRevenue: Number(
      (
        input.amount *
        recoveryProbability
      ).toFixed(2)
    ),

    confidence: Number(
      confidence.toFixed(4)
    ),

    risk,

    reasoning:
      "Fallback recovery policy selected the strategy using payment failure, incident context, transaction history, and recovery-risk signals.",
  };
}

/* =========================================================
   NORMALIZE GEMINI RESPONSE
   ========================================================= */

function normalizeDecision(
  parsed: any,
  input: AIRecoveryInput
): AIRecoveryDecision {
  const validActions = [
    "RETRY",
    "PAYMENT_LINK",
    "WAIT",
    "REVIEW",
  ] as const;

  type RecommendedAction =
    (typeof validActions)[number];

  const recommendedAction: RecommendedAction =
    validActions.includes(
      parsed?.recommendedAction
    )
      ? parsed.recommendedAction
      : "REVIEW";

  const recoveryProbability = Math.max(
    0,
    Math.min(
      1,
      Number(
        parsed?.recoveryProbability
      ) || 0
    )
  );

  const confidence = Math.max(
    0,
    Math.min(
      1,
      Number(parsed?.confidence) || 0
    )
  );

  const risk:
    | "LOW"
    | "MEDIUM"
    | "HIGH" =
    parsed?.risk === "LOW" ||
    parsed?.risk === "MEDIUM" ||
    parsed?.risk === "HIGH"
      ? parsed.risk
      : "MEDIUM";

  return {
    recommendedAction,

    recoveryProbability: Number(
      recoveryProbability.toFixed(4)
    ),

    expectedRecoveredRevenue: Number(
      (
        input.amount *
        recoveryProbability
      ).toFixed(2)
    ),

    confidence: Number(
      confidence.toFixed(4)
    ),

    risk,

    reasoning:
      typeof parsed?.reasoning === "string"
        ? parsed.reasoning
        : "RECOVR generated a recovery recommendation.",
  };
}

/* =========================================================
   GEMINI REQUEST
   ========================================================= */

async function requestGemini(
  client: GoogleGenAI,
  prompt: string
) {
  const models = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
  ];

  let lastError: unknown = null;

  for (const model of models) {
    /*
     * Try each model up to 2 times.
     */

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(
          `RECOVR GEMINI REQUEST: model=${model}, attempt=${attempt}`
        );

        const response =
          await client.models.generateContent({
            model,

            contents: prompt,

            config: {
              responseMimeType:
                "application/json",
            },
          });

        console.log(
          `RECOVR GEMINI SUCCESS: ${model}`
        );

        return response;
      } catch (error: any) {
        lastError = error;

        const status =
          error?.status ??
          error?.code ??
          error?.error?.code;

        const message =
          error?.message ??
          String(error);

        console.error(
          `RECOVR GEMINI ERROR: model=${model}, attempt=${attempt}`,
          {
            status,
            message,
          }
        );

        /*
         * Retry temporary Gemini capacity errors.
         */

        if (
          status === 503 ||
          status === 429 ||
          String(message).includes(
            "high demand"
          ) ||
          String(message).includes(
            "UNAVAILABLE"
          ) ||
          String(message).includes(
            "RESOURCE_EXHAUSTED"
          )
        ) {
          if (attempt < 2) {
            /*
             * Wait before retrying.
             */

            await new Promise(
              (resolve) =>
                setTimeout(
                  resolve,
                  1200 * attempt
                )
            );

            continue;
          }

          /*
           * Try next model.
           */

          break;
        }

        /*
         * Authentication / invalid request /
         * other non-transient error.
         */

        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "All Gemini recovery models failed."
      );
}

/* =========================================================
   BATCH RECOVERY ANALYSIS
   ========================================================= */

export async function analyzeRecoveryBatch(
  inputs: AIRecoveryInput[]
): Promise<AIRecoveryDecision[]> {
  if (inputs.length === 0) {
    return [];
  }

  const hasGeminiKey =
    Boolean(
      process.env.GEMINI_API_KEY
    );

  console.log(
    "GEMINI KEY AVAILABLE:",
    hasGeminiKey
  );

  /*
   * No Gemini key -> deterministic fallback.
   */

  if (!hasGeminiKey) {
    console.log(
      "RECOVR: No Gemini key. Using fallback."
    );

    return inputs.map(
      fallbackDecision
    );
  }

  try {
    /*
     * Prepare compact payment context.
     */

    const payments = inputs.map(
      (input, index) => ({
        index,

        paymentId:
          input.paymentId,

        amount:
          input.amount,

        currency:
          input.currency,

        failureReason:
          input.failureReason ??
          "Unknown",

        channel:
          input.channel ??
          "Unknown",

        provider:
          input.provider ??
          "Unknown",

        latencyMs:
          input.latencyMs ??
          0,

        incidentSeverity:
          input.incidentSeverity ??
          "Unknown",

        incidentConfidence:
          input.incidentConfidence ??
          0,

        previousAttempts:
          input.previousAttempts,

        previousRecoveries:
          input.previousRecoveries,
      })
    );

    /*
     * RECOVR decision prompt.
     */

    const prompt = `
You are RECOVR, an intelligent payment revenue recovery decision engine.

Your job is to analyze failed payments and select the safest recovery action that maximizes expected recovered revenue while minimizing customer friction and payment risk.

AVAILABLE ACTIONS:

RETRY
Use when the failure is temporary, transient, network-related, timeout-related, gateway-related, or likely to recover after provider stabilization.

PAYMENT_LINK
Use when the customer should receive an alternative payment opportunity, especially for insufficient funds, card declines, expired cards, or payment-method failures.

WAIT
Use when an active provider incident exists, repeated attempts have already failed, or another immediate attempt has a high probability of failure.

REVIEW
Use for fraud, security issues, blocked payments, suspicious behavior, or highly uncertain cases.

IMPORTANT DECISION RULES:

1. Analyze every payment independently.
2. Return exactly one decision for every input.
3. Preserve the original index.
4. Do not invent payment IDs.
5. recoveryProbability must be between 0 and 1.
6. confidence must be between 0 and 1.
7. risk must be LOW, MEDIUM, or HIGH.
8. reasoning must be short and specific to the payment.
9. If incidentSeverity is CRITICAL and incidentConfidence >= 0.8, strongly prefer WAIT.
10. If previousAttempts >= 3, strongly consider WAIT.
11. Never recommend repeated RETRY when an active critical provider incident exists.
12. Insufficient funds generally favors PAYMENT_LINK.
13. Card/payment-method declines generally favor PAYMENT_LINK unless strong incident evidence favors WAIT.
14. Fraud/security issues must favor REVIEW.
15. Timeout/network failures generally favor RETRY unless there is an active critical incident or excessive previous attempts.

FAILED PAYMENTS:

${JSON.stringify(payments)}

Return ONLY a valid JSON array.

The array must contain exactly ${inputs.length} objects.

Each object MUST have:

{
  "index": 0,
  "recommendedAction": "RETRY",
  "recoveryProbability": 0.82,
  "confidence": 0.90,
  "risk": "LOW",
  "reasoning": "Temporary provider failure is likely recoverable."
}

Do not return markdown.
Do not return code fences.
Do not return explanations outside the JSON array.
`;

    console.log(
      `RECOVR BATCH AI: analyzing ${inputs.length} payments`
    );

    /*
     * Create Gemini client only when actually needed.
     */

    const client =
      getGeminiClient();

    /*
     * Send ONE batch request.
     */

    const response =
      await requestGemini(
        client,
        prompt
      );

    const text =
      response.text?.trim();

    console.log(
      "RECOVR BATCH RESPONSE RECEIVED:",
      Boolean(text)
    );

    /*
     * Empty response -> fallback.
     */

    if (!text) {
      console.warn(
        "RECOVR: Empty Gemini response. Using fallback."
      );

      return inputs.map(
        fallbackDecision
      );
    }

    /*
     * Clean possible markdown fences.
     */

    const cleaned = text
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();

    /*
     * Parse Gemini JSON.
     */

    let parsed: any;

    try {
      parsed = JSON.parse(
        cleaned
      );
    } catch (parseError) {
      console.error(
        "RECOVR GEMINI JSON PARSE ERROR:",
        parseError
      );

      console.error(
        "RECOVR RAW GEMINI RESPONSE:",
        text
      );

      /*
       * Do NOT crash the recovery endpoint.
       */

      return inputs.map(
        fallbackDecision
      );
    }

    /*
     * Validate array.
     */

    if (!Array.isArray(parsed)) {
      console.error(
        "RECOVR: Gemini response was not an array."
      );

      return inputs.map(
        fallbackDecision
      );
    }

    /*
     * Build exactly one decision
     * for every original input.
     */

    const decisions =
      inputs.map(
        (input, index) => {
          const item =
            parsed.find(
              (decision: any) =>
                Number(
                  decision?.index
                ) === index
            );

          /*
           * If Gemini missed one payment,
           * fallback only that payment.
           */

          if (!item) {
            console.warn(
              `RECOVR: Gemini missed payment index ${index}. Using fallback.`
            );

            return fallbackDecision(
              input
            );
          }

          return normalizeDecision(
            item,
            input
          );
        }
      );

    console.log(
      `RECOVR BATCH COMPLETE: ${decisions.length} decisions`
    );

    return decisions;
  } catch (error: any) {
    /*
     * CRITICAL:
     * Gemini failure must NOT kill RECOVR.
     */

    console.error(
      "RECOVR BATCH AI ERROR:",
      error
    );

    const message =
      error?.message ??
      String(error);

    console.error(
      "RECOVR GEMINI ERROR MESSAGE:",
      message
    );

    console.log(
      "RECOVR: Gemini unavailable. Returning deterministic fallback decisions."
    );

    return inputs.map(
      fallbackDecision
    );
  }
}