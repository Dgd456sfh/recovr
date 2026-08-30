export type RecoveryRecommendation =
  | "RETRY"
  | "PAYMENT_LINK"
  | "REVIEW"
  | "NO_ACTION";

export type RecoveryTransaction = {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  failureReason: string | null;
  recoverable: boolean;
  recovered: boolean;
  recoveryStatus: string;
  recoveryAction: string | null;
};

export type RecoveryDecision = {
  recommendation: RecoveryRecommendation;
  confidence: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  shouldRecover: boolean;
};

export function evaluateRecovery(
  transaction: RecoveryTransaction
): RecoveryDecision {
  /* =====================================================
     ALREADY RECOVERED
     ===================================================== */

  if (transaction.recovered) {
    return {
      recommendation: "NO_ACTION",
      confidence: 100,
      priority: "LOW",
      reason:
        "Payment has already been successfully recovered.",
      shouldRecover: false,
    };
  }

  /* =====================================================
     NOT RECOVERABLE
     ===================================================== */

  if (!transaction.recoverable) {
    return {
      recommendation: "NO_ACTION",
      confidence: 100,
      priority: "LOW",
      reason:
        "Transaction is not eligible for recovery.",
      shouldRecover: false,
    };
  }

  /* =====================================================
     ONLY FAILED PAYMENTS NEED RECOVERY
     ===================================================== */

  if (transaction.status !== "FAILED") {
    return {
      recommendation: "NO_ACTION",
      confidence: 98,
      priority: "LOW",
      reason:
        "Transaction is not currently in a failed state.",
      shouldRecover: false,
    };
  }

  /* =====================================================
     RECOVERY ALREADY SCHEDULED
     ===================================================== */

  if (
    transaction.recoveryStatus ===
    "RETRY_SCHEDULED"
  ) {
    return {
      recommendation: "RETRY",
      confidence: 100,
      priority: "MEDIUM",
      reason:
        "A payment retry has already been scheduled.",
      shouldRecover: false,
    };
  }

  if (
    transaction.recoveryStatus ===
    "PAYMENT_LINK_GENERATED"
  ) {
    return {
      recommendation: "PAYMENT_LINK",
      confidence: 100,
      priority: "MEDIUM",
      reason:
        "A payment link has already been generated.",
      shouldRecover: false,
    };
  }

  const reason =
    transaction.failureReason
      ?.toLowerCase()
      .trim() || "";

  /* =====================================================
     TEMPORARY / TRANSIENT FAILURE

     Safe candidate for controlled retry.
     ===================================================== */

  if (
    reason.includes("timeout") ||
    reason.includes("timed out") ||
    reason.includes("network") ||
    reason.includes("temporary") ||
    reason.includes("gateway") ||
    reason.includes("server unavailable")
  ) {
    return {
      recommendation: "RETRY",
      confidence: 91,
      priority: "HIGH",
      reason:
        "The failure appears temporary or network-related. A controlled retry is the recommended recovery action.",
      shouldRecover: true,
    };
  }

  /* =====================================================
     INSUFFICIENT FUNDS

     Do not repeatedly retry.
     Give customer another opportunity to pay.
     ===================================================== */

  if (
    reason.includes("insufficient") ||
    reason.includes("insufficient funds") ||
    reason.includes("low balance") ||
    reason.includes("balance")
  ) {
    return {
      recommendation: "PAYMENT_LINK",
      confidence: 87,
      priority: "HIGH",
      reason:
        "The payment failed because of insufficient funds. A payment link gives the customer another opportunity to complete the payment later.",
      shouldRecover: true,
    };
  }

  /* =====================================================
     CARD / BANK DECLINE

     Never blindly retry the same failed method.
     Use an alternative payment opportunity.
     ===================================================== */

  if (
    reason.includes("declined") ||
    reason.includes("decline") ||
    reason.includes("do not honor") ||
    reason.includes("bank rejected") ||
    reason.includes("authorization failed") ||
    reason.includes("card declined")
  ) {
    return {
      recommendation: "PAYMENT_LINK",
      confidence: 84,
      priority: "HIGH",
      reason:
        "The original payment method was declined. A payment link is recommended so the customer can attempt payment using another method.",
      shouldRecover: true,
    };
  }

  /* =====================================================
     EXPIRED / INVALID PAYMENT METHOD
     ===================================================== */

  if (
    reason.includes("expired") ||
    reason.includes("invalid card") ||
    reason.includes("invalid payment") ||
    reason.includes("payment method")
  ) {
    return {
      recommendation: "PAYMENT_LINK",
      confidence: 86,
      priority: "MEDIUM",
      reason:
        "The original payment method may no longer be valid. A payment link allows the customer to choose another payment method.",
      shouldRecover: true,
    };
  }

  /* =====================================================
     FRAUD / RISK / SECURITY

     NEVER AUTOMATICALLY RECOVER.
     ===================================================== */

  if (
    reason.includes("fraud") ||
    reason.includes("risk") ||
    reason.includes("suspicious") ||
    reason.includes("blocked") ||
    reason.includes("security")
  ) {
    return {
      recommendation: "REVIEW",
      confidence: 96,
      priority: "HIGH",
      reason:
        "The payment failure may involve fraud, security, or risk controls. Manual review is required before any recovery action.",
      shouldRecover: false,
    };
  }

  /* =====================================================
     UNKNOWN FAILURE
     ===================================================== */

  return {
    recommendation: "REVIEW",
    confidence: 68,
    priority: "MEDIUM",
    reason:
      "The failure reason does not match a safe automated recovery strategy. Manual review is recommended.",
    shouldRecover: false,
  };
}