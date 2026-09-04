import { prisma } from "@/lib/db/prisma";

type RecoveryAction =
  | "RETRY"
  | "PAYMENT_LINK"
  | "WAIT"
  | "REVIEW";

type OutcomeResult = {
  transactionId: string;
  action: RecoveryAction;
  outcome: "RECOVERED" | "NOT_RECOVERED" | "WAITING" | "REVIEW";
  recoveredAmount: number;
  message: string;
};

function getRecoveryProbability(
  action: RecoveryAction
): number {
  switch (action) {
    case "RETRY":
      return 0.75;

    case "PAYMENT_LINK":
      return 0.68;

    case "WAIT":
      return 0;

    case "REVIEW":
      return 0;

    default:
      return 0;
  }
}

export async function simulateRecoveryOutcome(
  transactionId: string
): Promise<OutcomeResult> {
  const transaction =
    await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
    });

  if (!transaction) {
    throw new Error("Transaction not found.");
  }

  if (transaction.recovered) {
    return {
      transactionId: transaction.id,

      action:
        (transaction.recoveryAction ??
          "REVIEW") as RecoveryAction,

      outcome: "RECOVERED",

      recoveredAmount:
        transaction.recoveredAmount ??
        transaction.amount,

      message:
        "Transaction was already recovered.",
    };
  }

  const action =
    (transaction.recoveryAction ??
      transaction.recommendation ??
      "REVIEW") as RecoveryAction;

  /*
    WAIT cases stay waiting.
  */
  if (action === "WAIT") {
    await prisma.recoveryEvent.create({
      data: {
        transactionId: transaction.id,

        eventType:
          "RECOVERY_STILL_WAITING",

        action: "WAIT",

        message:
          "Simulated recovery remains paused while payment conditions are monitored.",
      },
    });

    return {
      transactionId: transaction.id,

      action,

      outcome: "WAITING",

      recoveredAmount: 0,

      message:
        "Recovery is still waiting for better conditions.",
    };
  }

  /*
    REVIEW cases stay in manual review.
  */
  if (action === "REVIEW") {
    await prisma.recoveryEvent.create({
      data: {
        transactionId: transaction.id,

        eventType:
          "MANUAL_REVIEW_PENDING",

        action: "REVIEW",

        message:
          "Simulated transaction remains in the manual review queue.",
      },
    });

    return {
      transactionId: transaction.id,

      action,

      outcome: "REVIEW",

      recoveredAmount: 0,

      message:
        "Transaction is waiting for manual review.",
    };
  }

  /*
    Deterministic simulation.

    This does NOT use real payments,
    Razorpay, banks, or customer money.
  */
  const probability =
    getRecoveryProbability(action);

  /*
    Generate a stable pseudo-random result
    from the transaction ID.
  */
  const score =
    transaction.id
      .split("")
      .reduce(
        (total, char) =>
          total + char.charCodeAt(0),
        0
      ) %
    100;

  const recovered =
    score < probability * 100;

  if (recovered) {
    const updated =
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          recovered: true,

          recoveredAmount:
            transaction.amount,

          recoveredAt:
            new Date(),

          recoveryStatus:
            "RECOVERED",
        },
      });

    await prisma.recoveryEvent.create({
      data: {
        transactionId:
          transaction.id,

        eventType:
          "PAYMENT_RECOVERED",

        action,

        message:
          `RECOVR simulated a successful ${action} recovery. No real money was processed.`,
      },
    });

    return {
      transactionId:
        updated.id,

      action,

      outcome:
        "RECOVERED",

      recoveredAmount:
        updated.recoveredAmount ??
        updated.amount,

      message:
        "Simulated payment recovery successful.",
    };
  }

  const updated =
    await prisma.transaction.update({
      where: {
        id: transaction.id,
      },

      data: {
        recovered: false,

        recoveredAmount: 0,

        recoveryStatus:
          "NOT_RECOVERED",
      },
    });

  await prisma.recoveryEvent.create({
    data: {
      transactionId:
        transaction.id,

      eventType:
        "RECOVERY_FAILED",

      action,

      message:
        `RECOVR simulated an unsuccessful ${action} recovery attempt. No real payment was attempted.`,
    },
  });

  return {
    transactionId:
      updated.id,

    action,

    outcome:
      "NOT_RECOVERED",

    recoveredAmount: 0,

    message:
      "Simulated recovery attempt was not successful.",
  };
}