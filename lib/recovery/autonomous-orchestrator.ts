import { prisma } from "@/lib/db/prisma";
import { optimizeRecoveryStrategy } from "@/lib/recovery/strategy-optimizer";

export async function runAutonomousRecovery(
  transactionId: string
) {
  const transaction = await prisma.transaction.findUnique({
    where: {
      id: transactionId,
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found.");
  }

  if (!transaction.recoverable) {
    return {
      transactionId: transaction.id,
      paymentId: transaction.paymentId,
      status: "NOT_ELIGIBLE",
      message: "Transaction is not eligible for recovery.",
    };
  }

  if (transaction.recovered) {
    return {
      transactionId: transaction.id,
      paymentId: transaction.paymentId,
      status: "ALREADY_RECOVERED",
      message: "Transaction has already been recovered.",
    };
  }

  const optimization =
    await optimizeRecoveryStrategy(transactionId);

  const strategy =
    optimization.recommendedStrategy;

  const confidence =
    optimization.confidence;

  const expectedRevenue =
    optimization.expectedRecoveredRevenue;

  const requiresHumanReview =
    confidence < 0.6 ||
    transaction.amount >= 15000 ||
    strategy === "MANUAL_REVIEW";

  if (requiresHumanReview) {
    await prisma.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        recoveryStatus: "REVIEW_REQUIRED",
        recoveryAction: "MANUAL_REVIEW",
        reason:
          "Autonomous execution blocked by RECOVR guardrails. Human review is required.",
      },
    });

    await prisma.recoveryEvent.create({
      data: {
        transactionId,
        eventType: "GUARDRAIL_BLOCKED",
        action: "MANUAL_REVIEW",
        message:
          "RECOVR blocked autonomous execution because the recovery decision did not satisfy safety guardrails.",
      },
    });

    return {
      transactionId,
      paymentId: transaction.paymentId,
      mode: "HUMAN_REVIEW",
      status: "REVIEW_REQUIRED",
      strategy,
      confidence,
      expectedRecoveredRevenue:
        expectedRevenue,
      guardrail: {
        passed: false,
        reason:
          "Low confidence, high transaction value, or manual review strategy triggered human approval.",
      },
      message:
        "Recovery requires human review before execution.",
    };
  }

  const action =
    strategy === "CONTROLLED_RETRY"
      ? "CONTROLLED_RETRY"
      : "PAYMENT_LINK";

  const message =
    action === "CONTROLLED_RETRY"
      ? "Autonomous controlled retry scheduled."
      : "Autonomous payment recovery link initiated.";

  await prisma.transaction.update({
    where: {
      id: transactionId,
    },
    data: {
      recoveryStatus: "EXECUTED",
      recoveryAction: action,
      recommendation:
        action === "CONTROLLED_RETRY"
          ? "RETRY"
          : "PAYMENT_LINK",
      confidence: Math.round(
        confidence * 100
      ),
      reason:
        `RECOVR autonomously selected ${action} after evaluating multiple recovery strategies.`,
    },
  });

  await prisma.recoveryEvent.create({
    data: {
      transactionId,
      eventType: "AUTONOMOUS_RECOVERY",
      action,
      message:
        `RECOVR autonomously executed ${action}. Expected recovered revenue: ₹${expectedRevenue}.`,
    },
  });

  return {
    transactionId,
    paymentId: transaction.paymentId,
    mode: "AUTONOMOUS",
    status: "EXECUTED",
    strategy,
    action,
    confidence,
    expectedRecoveredRevenue:
      expectedRevenue,
    guardrail: {
      passed: true,
      reason:
        "Confidence and transaction risk satisfied autonomous recovery guardrails.",
    },
    message,
  };
}