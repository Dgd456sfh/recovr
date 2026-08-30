import { prisma } from "@/lib/db/prisma";
import {
  evaluateRecovery,
  type RecoveryDecision,
} from "@/lib/recovery/engine";
import {
  orchestrateRecovery,
  type RecoveryAction,
} from "@/lib/orchestrator/actions";

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

/*
 * RECOVR fallback recovery probabilities.
 *
 * The current recovery engine does not return
 * recoveryProbability, so the orchestrator derives
 * a bounded probability from the recommended action.
 */
function getRecoveryProbability(
  action: RecoveryAction
): number {
  switch (action) {
    case "RETRY":
      return 0.7;

    case "PAYMENT_LINK":
      return 0.45;

    case "REVIEW":
      return 0;

    case "WAIT":
    default:
      return 0;
  }
}

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

function hasRecoveryActionBeenExecuted(
  recoveryStatus: string
) {
  return (
    recoveryStatus === "RETRY_SCHEDULED" ||
    recoveryStatus === "PAYMENT_LINK_GENERATED" ||
    recoveryStatus === "EXECUTED"
  );
}

export async function runOrchestrator(): Promise<OrchestratorRunResult> {
  const transactions =
    await prisma.transaction.findMany({
      where: {
        recoverable: true,
        recovered: false,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

  const results: OrchestratorRunResult["results"] =
    [];

  let executed = 0;
  let skipped = 0;
  let reviewRequired = 0;

  for (const transaction of transactions) {
    try {
      /*
       * STEP 1
       * Evaluate the transaction using RECOVR's
       * deterministic recovery decision engine.
       */
      const decision =
        evaluateRecovery(transaction);

      /*
       * STEP 2
       * Persist the latest recovery intelligence.
       */
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          recommendation:
            decision.recommendation,

          confidence:
            decision.confidence,

          reason:
            decision.reason,
        },
      });

      /*
       * STEP 3
       * Convert recommendation into an
       * orchestrator action.
       */
      const action =
        mapRecommendationToAction(
          decision
        );

      /*
       * STEP 4
       * Do not execute unsafe,
       * manual-review, or WAIT cases.
       */
      if (
        !decision.shouldRecover ||
        action === "WAIT" ||
        action === "REVIEW"
      ) {
        reviewRequired++;

        await prisma.recoveryEvent.create({
          data: {
            transactionId:
              transaction.id,

            eventType:
              "RECOVERY_REVIEW_REQUIRED",

            action,

            message:
              decision.reason,
          },
        });

        results.push({
          transactionId:
            transaction.id,

          paymentId:
            transaction.paymentId,

          action,

          status:
            action === "WAIT"
              ? "WAITING"
              : "REVIEW_REQUIRED",

          message:
            decision.reason,

          simulated: true,
        });

        continue;
      }

      /*
       * STEP 5
       * Prevent duplicate execution.
       */
      if (
        hasRecoveryActionBeenExecuted(
          transaction.recoveryStatus
        )
      ) {
        skipped++;

        results.push({
          transactionId:
            transaction.id,

          paymentId:
            transaction.paymentId,

          action,

          status: "SKIPPED",

          message:
            "Recovery action has already been executed or scheduled.",

          simulated: true,
        });

        continue;
      }

      /*
       * STEP 6
       * Determine bounded recovery probability.
       *
       * IMPORTANT:
       * This is simulation only.
       * No real Razorpay payment is attempted.
       */
      const recoveryProbability =
        getRecoveryProbability(action);

      /*
       * STEP 7
       * Execute the controlled orchestration layer.
       */
      const orchestrationResult =
        await orchestrateRecovery({
          transactionId:
            transaction.id,

          paymentId:
            transaction.paymentId,

          action,

          recoveryProbability,

          confidence:
            decision.confidence,

          risk:
            decision.priority,

          reasoning:
            decision.reason,
        });

      /*
       * STEP 8
       * Persist recovery state.
       */
      let recoveryStatus:
        | "RETRY_SCHEDULED"
        | "PAYMENT_LINK_GENERATED"
        | "EXECUTED"
        | "PENDING" = "PENDING";

      if (action === "RETRY") {
        recoveryStatus =
          "RETRY_SCHEDULED";
      } else if (
        action === "PAYMENT_LINK"
      ) {
        recoveryStatus =
          "PAYMENT_LINK_GENERATED";
      } else {
        recoveryStatus = "EXECUTED";
      }

      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          recoveryStatus,

          recoveryAction:
            action === "RETRY"
              ? "CONTROLLED_RETRY"
              : action === "PAYMENT_LINK"
              ? "PAYMENT_LINK"
              : null,

          recommendation:
            decision.recommendation,

          confidence:
            decision.confidence,

          reason:
            decision.reason,
        },
      });

      /*
       * STEP 9
       * Write immutable-style audit information.
       */
      await prisma.recoveryEvent.create({
        data: {
          transactionId:
            transaction.id,

          eventType:
            "AUTONOMOUS_RECOVERY",

          action:
            action === "RETRY"
              ? "CONTROLLED_RETRY"
              : action === "PAYMENT_LINK"
              ? "PAYMENT_LINK"
              : action,

          message:
            `RECOVR autonomously executed ${action}. ${orchestrationResult.message}`,
        },
      });

      executed++;

      results.push({
        transactionId:
          transaction.id,

        paymentId:
          transaction.paymentId,

        action,

        status:
          orchestrationResult.status,

        message:
          orchestrationResult.message,

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
        transactionId:
          transaction.id,

        paymentId:
          transaction.paymentId,

        action: "REVIEW",

        status:
          "REVIEW_REQUIRED",

        message:
          errorMessage,

        simulated: true,
      });

      await prisma.recoveryEvent.create({
        data: {
          transactionId:
            transaction.id,

          eventType:
            "RECOVERY_REVIEW_REQUIRED",

          action: "REVIEW",

          message:
            errorMessage,
        },
      });
    }
  }

  return {
    success: true,

    processed:
      transactions.length,

    executed,

    skipped,

    reviewRequired,

    results,
  };
}