import { prisma } from "@/lib/db/prisma";

type RecoveryAction =
  | "CONTROLLED_RETRY"
  | "PAYMENT_LINK"
  | "MANUAL_REVIEW"
  | "WAIT";

type StrategyResult = {
  action: RecoveryAction;
  baseProbability: number;
  historicalRate: number;
  riskPenalty: number;
  expectedRecoveredRevenue: number;
  score: number;
  reasoning: string;
};

function classifyFailure(reason: string) {
  const failure = reason.toLowerCase();

  if (
    failure.includes("timeout") ||
    failure.includes("network") ||
    failure.includes("temporary") ||
    failure.includes("gateway") ||
    failure.includes("connection")
  ) {
    return "TRANSIENT";
  }

  if (
    failure.includes("insufficient") ||
    failure.includes("balance")
  ) {
    return "INSUFFICIENT_FUNDS";
  }

  if (
    failure.includes("declined") ||
    failure.includes("decline")
  ) {
    return "DECLINED";
  }

  if (
    failure.includes("fraud") ||
    failure.includes("security") ||
    failure.includes("suspicious")
  ) {
    return "HIGH_RISK";
  }

  return "UNKNOWN";
}

function getBaseProbability(
  action: RecoveryAction,
  failureClass: string
) {
  if (
    action === "CONTROLLED_RETRY" &&
    failureClass === "TRANSIENT"
  ) {
    return 0.84;
  }

  if (
    action === "PAYMENT_LINK" &&
    failureClass === "INSUFFICIENT_FUNDS"
  ) {
    return 0.76;
  }

  if (
    action === "PAYMENT_LINK" &&
    failureClass === "DECLINED"
  ) {
    return 0.70;
  }

  if (
    action === "WAIT" &&
    failureClass === "TRANSIENT"
  ) {
    return 0.58;
  }

  if (action === "MANUAL_REVIEW") {
    return failureClass === "HIGH_RISK"
      ? 0.80
      : 0.42;
  }

  return 0.35;
}

function getRiskPenalty(
  action: RecoveryAction,
  failureClass: string,
  previousAttempts: number
) {
  let penalty = 0;

  if (
    action === "CONTROLLED_RETRY" &&
    failureClass !== "TRANSIENT"
  ) {
    penalty += 0.15;
  }

  if (
    action === "CONTROLLED_RETRY" &&
    previousAttempts >= 2
  ) {
    penalty += 0.20;
  }

  if (
    action === "CONTROLLED_RETRY" &&
    previousAttempts >= 3
  ) {
    penalty += 0.20;
  }

  if (
    action === "PAYMENT_LINK" &&
    failureClass === "HIGH_RISK"
  ) {
    penalty += 0.15;
  }

  return Math.min(0.5, penalty);
}

export async function getAdaptiveRecommendation(
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

  const historicalTransactions =
    await prisma.transaction.findMany({
      where: {
        recoverable: true,
        id: {
          not: transaction.id,
        },
      },
    });

  const actions: RecoveryAction[] = [
    "CONTROLLED_RETRY",
    "PAYMENT_LINK",
    "WAIT",
    "MANUAL_REVIEW",
  ];

  const historicalStats = new Map<
    RecoveryAction,
    {
      attempts: number;
      recovered: number;
      recoveredRevenue: number;
      processedRevenue: number;
    }
  >();

  for (const item of historicalTransactions) {
    const action =
      item.recoveryAction ??
      item.recommendation;

    if (
      !action ||
      !actions.includes(
        action as RecoveryAction
      )
    ) {
      continue;
    }

    const typedAction =
      action as RecoveryAction;

    const current =
      historicalStats.get(
        typedAction
      ) ?? {
        attempts: 0,
        recovered: 0,
        recoveredRevenue: 0,
        processedRevenue: 0,
      };

    current.attempts += 1;

    current.processedRevenue +=
      item.amount;

    if (item.recovered) {
      current.recovered += 1;

      current.recoveredRevenue +=
        item.recoveredAmount ??
        item.amount;
    }

    historicalStats.set(
      typedAction,
      current
    );
  }

  const failureReason =
    transaction.failureReason ?? "Unknown";

  const failureClass =
    classifyFailure(failureReason);

  const previousAttempts =
    await prisma.recoveryEvent.count({
      where: {
        transactionId:
          transaction.id,
      },
    });

  const previousRecoveries =
    await prisma.recoveryEvent.count({
      where: {
        transactionId:
          transaction.id,
        eventType: {
          in: [
            "PAYMENT_RECOVERED",
            "RECOVERY_SUCCESS",
            "RECOVERY_OUTCOME",
          ],
        },
      },
    });

  const strategies: StrategyResult[] =
    actions.map((action) => {
      const baseProbability =
        getBaseProbability(
          action,
          failureClass
        );

      const stats =
        historicalStats.get(action);

      const historicalRate =
        stats && stats.attempts > 0
          ? stats.recovered /
            stats.attempts
          : 0.5;

      const riskPenalty =
        getRiskPenalty(
          action,
          failureClass,
          previousAttempts
        );

      /*
       * Blend model knowledge with
       * observed recovery outcomes.
       *
       * 60% = failure-context intelligence
       * 30% = historical learning
       * 10% = risk adjustment
       */
      const probability =
        Math.max(
          0.05,
          Math.min(
            0.98,
            baseProbability * 0.6 +
              historicalRate * 0.3 -
              riskPenalty * 0.1
          )
        );

      const expectedRecoveredRevenue =
        transaction.amount *
        probability;

      /*
       * Revenue-aware strategy score.
       * Higher-value recoveries matter more,
       * but risk is explicitly penalized.
       */
      const revenueScore =
        Math.min(
          expectedRecoveredRevenue /
            Math.max(
              transaction.amount,
              1
            ),
          1
        );

      const learningScore =
        historicalRate;

      const riskScore =
        1 - riskPenalty;

      const score =
        revenueScore * 0.55 +
        learningScore * 0.30 +
        riskScore * 0.15;

      let reasoning =
        "Strategy selected using failure context, historical outcomes, expected recovered revenue, and risk.";

      if (
        action ===
          "CONTROLLED_RETRY" &&
        failureClass === "TRANSIENT"
      ) {
        reasoning =
          "Transient failure detected; controlled retry has high recovery potential.";
      }

      if (
        action === "PAYMENT_LINK" &&
        failureClass ===
          "INSUFFICIENT_FUNDS"
      ) {
        reasoning =
          "Insufficient funds detected; alternative payment opportunity is preferred.";
      }

      if (
        action === "PAYMENT_LINK" &&
        failureClass === "DECLINED"
      ) {
        reasoning =
          "Card decline detected; an alternative payment route may recover the revenue.";
      }

      if (
        action === "WAIT" &&
        failureClass === "TRANSIENT"
      ) {
        reasoning =
          "Temporary failure detected; waiting can avoid repeated provider failures.";
      }

      if (
        action === "MANUAL_REVIEW" &&
        failureClass === "HIGH_RISK"
      ) {
        reasoning =
          "Security or fraud-like signal detected; manual review minimizes recovery risk.";
      }

      return {
        action,

        baseProbability:
          Number(
            baseProbability.toFixed(3)
          ),

        historicalRate:
          Number(
            historicalRate.toFixed(3)
          ),

        riskPenalty:
          Number(
            riskPenalty.toFixed(3)
          ),

        expectedRecoveredRevenue:
          Number(
            expectedRecoveredRevenue.toFixed(
              2
            )
          ),

        score:
          Number(score.toFixed(4)),

        reasoning,
      };
    });

  strategies.sort(
    (a, b) =>
      b.score - a.score
  );

  const best =
    strategies[0];

  const confidence = Math.min(
    0.98,
    Math.max(
      0.55,
      best.score
    )
  );

  return {
    transactionId:
      transaction.id,

    paymentId:
      transaction.paymentId,

    amount:
      transaction.amount,

    currency:
      transaction.currency,

    failureReason,

    failureClass,

    previousAttempts,

    previousRecoveries,

    adaptiveRecommendation:
      best.action,

    recoveryProbability:
      Number(
        (
          best.baseProbability *
            0.6 +
          best.historicalRate *
            0.3
        ).toFixed(3)
      ),

    expectedRecoveredRevenue:
      best.expectedRecoveredRevenue,

    confidence:
      Number(
        confidence.toFixed(3)
      ),

    strategies,

    learning: Array.from(
      historicalStats.entries()
    ).map(
      ([action, data]) => ({
        action,
        attempts:
          data.attempts,
        recovered:
          data.recovered,
        recoveryRate:
          data.attempts > 0
            ? Number(
                (
                  (data.recovered /
                    data.attempts) *
                  100
                ).toFixed(2)
              )
            : 0,
        revenueProcessed:
          data.processedRevenue,
        recoveredRevenue:
          data.recoveredRevenue,
      })
    ),

    reasoning:
      `RECOVR analyzed the ${failureClass.toLowerCase()} failure pattern and evaluated ${strategies.length} recovery strategies using historical recovery outcomes, expected recovered revenue, previous attempts, and risk. ${best.action} achieved the highest outcome-aware score.`,

    engine: {
      name:
        "RECOVR Outcome-Aware Recovery Intelligence",

      version:
        "2.0",

      type:
        "HYBRID_AI_LEARNING_ENGINE",

      signals: [
        "failure_pattern",
        "historical_outcomes",
        "expected_recovered_revenue",
        "previous_attempts",
        "recovery_risk",
      ],
    },
  };
}