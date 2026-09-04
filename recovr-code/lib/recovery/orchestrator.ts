import { prisma } from "@/lib/db/prisma";
import {
  evaluateRecovery,
  type RecoveryDecision,
} from "@/lib/recovery/engine";

export type RecoveryAction =
  | "RETRY"
  | "PAYMENT_LINK"
  | "WAIT"
  | "REVIEW";

type SimpleOrchestratorInput = {
  transactionId: string;
  action: RecoveryAction;
  reasoning: string;
};

type SimpleOrchestratorResult = {
  action: RecoveryAction;
  recoveryStatus:
    | "RETRY_SCHEDULED"
    | "PAYMENT_LINK_GENERATED"
    | "WAITING"
    | "REVIEW_REQUIRED";
  message: string;
};

export async function orchestrateRecovery(
  input: SimpleOrchestratorInput
): Promise<SimpleOrchestratorResult> {
  switch (input.action) {
    case "RETRY":
      return {
        action: "RETRY",
        recoveryStatus: "RETRY_SCHEDULED",
        message:
          "Recovery retry scheduled in simulation mode. No real payment was attempted.",
      };

    case "PAYMENT_LINK":
      return {
        action: "PAYMENT_LINK",
        recoveryStatus: "PAYMENT_LINK_GENERATED",
        message:
          "Payment link recovery simulated. No real payment link was created.",
      };

    case "WAIT":
      return {
        action: "WAIT",
        recoveryStatus: "WAITING",
        message:
          "Recovery paused while RECOVR waits for better recovery conditions.",
      };

    case "REVIEW":
    default:
      return {
        action: "REVIEW",
        recoveryStatus: "REVIEW_REQUIRED",
        message:
          "Recovery requires manual review before any action.",
      };
  }
}

type OrchestratorRunResult = {
  success: boolean;
  processed: number;
  executed: number;
  skipped: number;
  reviewRequired: number;

  results: Array<{
    transactionId: string;
    paymentId: string;
    action: RecoveryAction;
    status: string;
    message: string;
    simulated: true;
  }>;
};

function mapRecommendationToAction(
  decision: RecoveryDecision
): RecoveryAction {
  switch (decision.recommendation) {
    case "RETRY":
      return "RETRY";

    case "PAYMENT_LINK":
      return "PAYMENT_LINK";

    case "REVIEW":
      return "REVIEW";

    case "NO_ACTION":
    default:
      return "WAIT";
  }
}

export async function runOrchestrator(): Promise<OrchestratorRunResult> {
  const transactions = await prisma.transaction.findMany({
    where: {
      recoverable: true,
      recovered: false,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const results: OrchestratorRunResult["results"] = [];

  let executed = 0;
  let skipped = 0;
  let reviewRequired = 0;

  for (const transaction of transactions) {
    try {
      // STEP 1: Evaluate recovery decision
      const decision = evaluateRecovery(transaction);

      // STEP 2: Save recovery intelligence
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          recommendation: decision.recommendation,
          confidence: decision.confidence,
          reason: decision.reason,
        },
      });

      // STEP 3: Convert recommendation into action
      const action = mapRecommendationToAction(decision);

      // STEP 4: Safety gate
      if (
        !decision.shouldRecover ||
        action === "WAIT" ||
        action === "REVIEW"
      ) {
        reviewRequired++;

        await prisma.recoveryEvent.create({
          data: {
            transactionId: transaction.id,
            eventType: "RECOVERY_REVIEW_REQUIRED",
            action,
            message: decision.reason,
          },
        });

        results.push({
          transactionId: transaction.id,
          paymentId: transaction.paymentId,
          action,
          status:
            action === "WAIT"
              ? "WAITING"
              : "REVIEW_REQUIRED",
          message: decision.reason,
          simulated: true,
        });

        continue;
      }

      // STEP 5: Prevent duplicate recovery actions
      if (
        transaction.recoveryStatus === "RETRY_SCHEDULED" ||
        transaction.recoveryStatus ===
          "PAYMENT_LINK_GENERATED" ||
        transaction.recoveryStatus === "EXECUTED"
      ) {
        skipped++;

        results.push({
          transactionId: transaction.id,
          paymentId: transaction.paymentId,
          action,
          status: "SKIPPED",
          message:
            "Recovery action has already been executed or scheduled.",
          simulated: true,
        });

        continue;
      }

      // STEP 6: Execute simulated recovery
      const orchestration = await orchestrateRecovery({
        transactionId: transaction.id,
        action,
        reasoning: decision.reason,
      });

      // STEP 7: Persist recovery status
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          recoveryStatus:
            orchestration.recoveryStatus,

          recoveryAction:
            action === "RETRY"
              ? "CONTROLLED_RETRY"
              : action === "PAYMENT_LINK"
              ? "PAYMENT_LINK"
              : null,

          recommendation: decision.recommendation,
          confidence: decision.confidence,
          reason: decision.reason,
        },
      });

      // STEP 8: Create audit event
      await prisma.recoveryEvent.create({
        data: {
          transactionId: transaction.id,
          eventType: "AUTONOMOUS_RECOVERY",
          action:
            action === "RETRY"
              ? "CONTROLLED_RETRY"
              : action === "PAYMENT_LINK"
              ? "PAYMENT_LINK"
              : action,
          message:
            `RECOVR autonomously executed ${action}. ${orchestration.message}`,
        },
      });

      executed++;

      results.push({
        transactionId: transaction.id,
        paymentId: transaction.paymentId,
        action,
        status: orchestration.recoveryStatus,
        message: orchestration.message,
        simulated: true,
      });
    } catch (error) {
      console.error(
        `RECOVR orchestration failed for ${transaction.paymentId}:`,
        error
      );

      skipped++;

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Orchestration failed and requires manual review.";

      results.push({
        transactionId: transaction.id,
        paymentId: transaction.paymentId,
        action: "REVIEW",
        status: "REVIEW_REQUIRED",
        message: errorMessage,
        simulated: true,
      });

      await prisma.recoveryEvent.create({
        data: {
          transactionId: transaction.id,
          eventType: "RECOVERY_REVIEW_REQUIRED",
          action: "REVIEW",
          message: errorMessage,
        },
      });
    }
  }

  return {
    success: true,
    processed: transactions.length,
    executed,
    skipped,
    reviewRequired,
    results,
  };
}