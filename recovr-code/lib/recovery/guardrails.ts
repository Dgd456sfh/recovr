import type {
  AIRecoveryDecision,
  AIRecoveryInput,
} from "@/lib/recovery/ai-engine";

export type GuardrailAction =
  | "RETRY"
  | "PAYMENT_LINK"
  | "WAIT"
  | "REVIEW";

export type GuardrailResult = {
  originalAction: GuardrailAction;
  finalAction: GuardrailAction;

  overridden: boolean;

  approved: boolean;

  risk: "LOW" | "MEDIUM" | "HIGH";

  confidence: number;

  reasons: string[];

  guardrailsTriggered: string[];
};

type GuardrailInput = {
  decision: AIRecoveryDecision;
  input: AIRecoveryInput;
};

/**
 * RECOVR SAFETY GUARDRAILS
 *
 * Gemini recommends an action.
 * Guardrails decide whether that action
 * is safe to execute.
 *
 * AI NEVER bypasses these rules.
 */
export function applyRecoveryGuardrails({
  decision,
  input,
}: GuardrailInput): GuardrailResult {
  const originalAction =
    decision.recommendedAction;

  let finalAction = originalAction;

  let overridden = false;

  let approved = true;

  const reasons: string[] = [];

  const guardrailsTriggered: string[] = [];

  let risk = decision.risk;

  const confidence = decision.confidence;

  /*
   * GUARDRAIL 1
   *
   * Fraud/security signals must always
   * require manual review.
   */
  const failureReason =
    input.failureReason?.toLowerCase() ?? "";

  const hasSecurityRisk =
    failureReason.includes("fraud") ||
    failureReason.includes("security") ||
    failureReason.includes("blocked") ||
    failureReason.includes("risk");

  if (hasSecurityRisk) {
    finalAction = "REVIEW";

    overridden = originalAction !== "REVIEW";

    approved = false;

    risk = "HIGH";

    guardrailsTriggered.push(
      "SECURITY_RISK"
    );

    reasons.push(
      "Security or fraud-related failure requires manual review."
    );
  }

  /*
   * GUARDRAIL 2
   *
   * Critical active incidents should pause
   * automated recovery.
   */
  const criticalIncident =
    input.incidentSeverity === "CRITICAL" &&
    (input.incidentConfidence ?? 0) >= 0.8;

  if (criticalIncident) {
    finalAction = "WAIT";

    overridden = originalAction !== "WAIT";

    approved = true;

    guardrailsTriggered.push(
      "CRITICAL_INCIDENT"
    );

    reasons.push(
      "Critical provider incident is active. Recovery is paused until conditions stabilize."
    );
  }

  /*
   * GUARDRAIL 3
   *
   * Too many previous attempts create
   * customer friction and duplicate risk.
   */
  if (input.previousAttempts >= 3) {
    finalAction = "WAIT";

    overridden = originalAction !== "WAIT";

    approved = true;

    guardrailsTriggered.push(
      "ATTEMPT_LIMIT"
    );

    reasons.push(
      "Recovery attempt limit reached. Additional automated attempts are paused."
    );
  }

  /*
   * GUARDRAIL 4
   *
   * Low-confidence AI decisions should
   * never automatically execute.
   */
  if (confidence < 0.6) {
    finalAction = "REVIEW";

    overridden = originalAction !== "REVIEW";

    approved = false;

    risk =
      risk === "HIGH"
        ? "HIGH"
        : "MEDIUM";

    guardrailsTriggered.push(
      "LOW_AI_CONFIDENCE"
    );

    reasons.push(
      "AI confidence is below the automated execution threshold."
    );
  }

  /*
   * GUARDRAIL 5
   *
   * Extremely low recovery probability
   * should not trigger an automated attempt.
   */
  if (
    decision.recoveryProbability < 0.2
  ) {
    finalAction = "REVIEW";

    overridden = originalAction !== "REVIEW";

    approved = false;

    guardrailsTriggered.push(
      "LOW_RECOVERY_PROBABILITY"
    );

    reasons.push(
      "Recovery probability is too low for automated execution."
    );
  }

  /*
   * GUARDRAIL 6
   *
   * Very high-value transactions receive
   * additional scrutiny.
   *
   * Threshold is intentionally conservative
   * for this MVP.
   */
  if (input.amount >= 100000) {
    finalAction = "REVIEW";

    overridden = originalAction !== "REVIEW";

    approved = false;

    risk = "HIGH";

    guardrailsTriggered.push(
      "HIGH_VALUE_TRANSACTION"
    );

    reasons.push(
      "High-value transaction requires additional review before recovery."
    );
  }

  /*
   * GUARDRAIL 7
   *
   * Unknown or missing failure reasons
   * should not be blindly retried.
   */
  if (
    !input.failureReason ||
    failureReason === "unknown"
  ) {
    if (
      finalAction === "RETRY" ||
      finalAction === "PAYMENT_LINK"
    ) {
      finalAction = "REVIEW";

      overridden = true;

      approved = false;

      guardrailsTriggered.push(
        "UNKNOWN_FAILURE"
      );

      reasons.push(
        "Failure reason is unknown. Automated recovery requires manual review."
      );
    }
  }

  /*
   * If nothing blocked the action,
   * Gemini's recommendation is approved.
   */
  if (guardrailsTriggered.length === 0) {
    reasons.push(
      "AI recommendation passed RECOVR safety guardrails."
    );
  }

  return {
    originalAction,

    finalAction,

    overridden,

    approved,

    risk,

    confidence,

    reasons,

    guardrailsTriggered,
  };
}