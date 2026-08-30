import { prisma } from "@/lib/db/prisma";

export async function getRecoveryLearning() {
  const transactions =
    await prisma.transaction.findMany({
      where: {
        recoverable: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

  const stats = new Map<
    string,
    {
      attempts: number;
      recovered: number;
      revenueProcessed: number;
      recoveredRevenue: number;
    }
  >();

  for (const transaction of transactions) {
    const action =
      transaction.recoveryAction ??
      transaction.recommendation;

    if (!action || action === "NO_ACTION") {
      continue;
    }

    const current =
      stats.get(action) ?? {
        attempts: 0,
        recovered: 0,
        revenueProcessed: 0,
        recoveredRevenue: 0,
      };

    current.attempts += 1;

    current.revenueProcessed +=
      transaction.amount;

    if (transaction.recovered) {
      current.recovered += 1;

      current.recoveredRevenue +=
        transaction.recoveredAmount ?? 0;
    }

    stats.set(action, current);
  }

  const learning = Array.from(
    stats.entries()
  ).map(([action, data]) => ({
    action,

    attempts: data.attempts,

    recoveredCases: data.recovered,

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
      data.revenueProcessed,

    recoveredRevenue:
      data.recoveredRevenue,

    effectiveness:
      data.revenueProcessed > 0
        ? Number(
            (
              (data.recoveredRevenue /
                data.revenueProcessed) *
              100
            ).toFixed(2)
          )
        : 0,
  }));

  return learning.sort(
    (a, b) =>
      b.effectiveness -
      a.effectiveness
  );
}