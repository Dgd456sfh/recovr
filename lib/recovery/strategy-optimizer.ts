import { prisma } from "@/lib/db/prisma";

type Strategy =
  | "CONTROLLED_RETRY"
  | "PAYMENT_LINK"
  | "MANUAL_REVIEW";

type StrategyScore = {
  action: Strategy;
  probability: number;
  historicalPerformance: number;
  expectedRecoveredRevenue: number;
  score: number;
};

export async function optimizeRecoveryStrategy(
  transactionId: string
) {
  const transaction =
    await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
    });

  if (!transaction) {
    throw new Error("Transaction not found.");
  }

  const recoverableTransactions =
    await prisma.transaction.findMany({
      where: {
        recoverable: true,
      },
    });

  const actions: Strategy[] = [
    "CONTROLLED_RETRY",
    "PAYMENT_LINK",
    "MANUAL_REVIEW",
  ];

  const historicalStats = new Map<
    string,
    {
      attempts: number;
      recovered: number;
    }
  >();

  for (const item of recoverableTransactions) {
    const action =
      item.recoveryAction ?? item.recommendation;

    if (!action || action === "NO_ACTION") {
      continue;
    }

    const current =
      historicalStats.get(action) ?? {
        attempts: 0,
        recovered: 0,
      };

    current.attempts += 1;

    if (item.recovered) {
      current.recovered += 1;
    }

    historicalStats.set(action, current);
  }

  const failureReason =
    transaction.failureReason?.toLowerCase() ?? "";

  const scores: StrategyScore[] = actions.map(
    (action) => {
      let probability = 0.5;

      if (
        action === "CONTROLLED_RETRY" &&
        (
          failureReason.includes("timeout") ||
          failureReason.includes("network")
        )
      ) {
        probability = 0.82;
      }

      if (
        action === "PAYMENT_LINK" &&
        (
          failureReason.includes("declined") ||
          failureReason.includes("insufficient funds")
        )
      ) {
        probability = 0.7;
      }

      if (action === "MANUAL_REVIEW") {
        probability =
          transaction.amount > 10000
            ? 0.65
            : 0.4;
      }

      const stats =
        historicalStats.get(action);

      const historicalPerformance =
        stats && stats.attempts > 0
          ? stats.recovered / stats.attempts
          : 0.5;

      const expectedRecoveredRevenue =
        transaction.amount * probability;

      const score =
        probability * 0.5 +
        historicalPerformance * 0.3 +
        Math.min(
          transaction.amount / 10000,
          1
        ) *
          0.2;

      return {
        action,
        probability: Number(
          probability.toFixed(2)
        ),
        historicalPerformance: Number(
          historicalPerformance.toFixed(2)
        ),
        expectedRecoveredRevenue: Number(
          expectedRecoveredRevenue.toFixed(2)
        ),
        score: Number(
          score.toFixed(4)
        ),
      };
    }
  );

  scores.sort(
    (a, b) => b.score - a.score
  );

  const bestStrategy = scores[0];

  return {
    transactionId: transaction.id,

    paymentId: transaction.paymentId,

    amount: transaction.amount,

    failureReason:
      transaction.failureReason,

    strategies: scores,

    recommendedStrategy:
      bestStrategy.action,

    expectedRecoveredRevenue:
      bestStrategy.expectedRecoveredRevenue,

    confidence: Number(
      Math.min(
        0.98,
        bestStrategy.score
      ).toFixed(2)
    ),

    reasoning:
      `RECOVR evaluated ${scores.length} recovery strategies using failure patterns, historical recovery outcomes, transaction value, and expected recovered revenue. ${bestStrategy.action} achieved the highest strategy score.`,
  };
}