import { prisma } from "@/lib/db/prisma";

export type ExecutionResult = {
  transactionId: string;
  paymentId: string;
  action: "RETRY" | "PAYMENT_LINK" | "REVIEW" | "NO_ACTION";
  status: "EXECUTED" | "SKIPPED" | "FAILED";
  message: string;
};

export async function executeRecovery(
  transactionId: string
): Promise<ExecutionResult> {
  const transaction = await prisma.transaction.findUnique({
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
      paymentId: transaction.paymentId,
      action: "NO_ACTION",
      status: "SKIPPED",
      message: "Payment has already been recovered.",
    };
  }

  if (!transaction.recoverable) {
    return {
      transactionId: transaction.id,
      paymentId: transaction.paymentId,
      action: "NO_ACTION",
      status: "SKIPPED",
      message: "Transaction is not recoverable.",
    };
  }

  const action = transaction.recommendation;

  if (
    action !== "RETRY" &&
    action !== "PAYMENT_LINK" &&
    action !== "REVIEW"
  ) {
    return {
      transactionId: transaction.id,
      paymentId: transaction.paymentId,
      action: "NO_ACTION",
      status: "SKIPPED",
      message: "No recovery action recommended.",
    };
  }

  if (action === "REVIEW") {
    await prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        recoveryStatus: "REVIEW_REQUIRED",
        recoveryAction: "MANUAL_REVIEW",
      },
    });

    await prisma.recoveryEvent.create({
      data: {
        transactionId: transaction.id,
        eventType: "RECOVERY_REVIEW",
        action: "MANUAL_REVIEW",
        message:
          "AI determined that automatic recovery is unsafe. Manual review required.",
      },
    });

    return {
      transactionId: transaction.id,
      paymentId: transaction.paymentId,
      action: "REVIEW",
      status: "EXECUTED",
      message: "Transaction sent for manual review.",
    };
  }

  if (action === "RETRY") {
    await prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        recoveryStatus: "RETRY_SCHEDULED",
        recoveryAction: "CONTROLLED_RETRY",
      },
    });

    await prisma.recoveryEvent.create({
      data: {
        transactionId: transaction.id,
        eventType: "RECOVERY_ACTION",
        action: "CONTROLLED_RETRY",
        message:
          "AI recommended a controlled retry for this transient payment failure.",
      },
    });

    return {
      transactionId: transaction.id,
      paymentId: transaction.paymentId,
      action: "RETRY",
      status: "EXECUTED",
      message: "Controlled retry scheduled.",
    };
  }

  if (action === "PAYMENT_LINK") {
    await prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        recoveryStatus: "PAYMENT_LINK_GENERATED",
        recoveryAction: "PAYMENT_LINK",
      },
    });

    await prisma.recoveryEvent.create({
      data: {
        transactionId: transaction.id,
        eventType: "RECOVERY_ACTION",
        action: "PAYMENT_LINK",
        message:
          "AI recommended an alternative payment opportunity.",
      },
    });

    return {
      transactionId: transaction.id,
      paymentId: transaction.paymentId,
      action: "PAYMENT_LINK",
      status: "EXECUTED",
      message: "Payment link recovery action generated.",
    };
  }

  return {
    transactionId: transaction.id,
    paymentId: transaction.paymentId,
    action: "NO_ACTION",
    status: "SKIPPED",
    message: "No action taken.",
  };
}