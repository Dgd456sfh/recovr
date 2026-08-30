import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

import {
  analyzeRecoveryBatch,
  type AIRecoveryInput,
} from "@/lib/recovery/ai-engine";

import {
  orchestrateRecovery,
  type RecoveryAction,
} from "@/lib/recovery/orchestrator";

/* =========================================================
   TYPES
   ========================================================= */

type GuardrailResult = {
  originalAction: RecoveryAction;
  finalAction: RecoveryAction;
  overridden: boolean;
  approved: boolean;
  triggered: string[];
  reasons: string[];
};

type OrchestrationResult = {
  action: RecoveryAction;
  recoveryStatus:
    | "RETRY_SCHEDULED"
    | "PAYMENT_LINK_GENERATED"
    | "WAITING"
    | "REVIEW_REQUIRED";
  message: string;
};

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeRecoveryAction(
  value: string
): RecoveryAction {
  switch (value) {
    case "RETRY":
      return "RETRY";

    case "PAYMENT_LINK":
      return "PAYMENT_LINK";

    case "WAIT":
      return "WAIT";

    case "REVIEW":
      return "REVIEW";

    case "NO_ACTION":
    default:
      return "WAIT";
  }
}

function getRecoveryActionFromStatus(
  status: OrchestrationResult["recoveryStatus"]
): string | null {
  switch (status) {
    case "RETRY_SCHEDULED":
      return "CONTROLLED_RETRY";

    case "PAYMENT_LINK_GENERATED":
      return "PAYMENT_LINK";

    case "WAITING":
      return null;

    case "REVIEW_REQUIRED":
      return null;

    default:
      return null;
  }
}

/* =========================================================
   POST
   ========================================================= */

export async function POST() {
  try {
    /*
     * STEP 1
     * Find all currently recoverable failed transactions.
     */

    const transactions =
      await prisma.transaction.findMany({
        where: {
          status: "FAILED",
          recoverable: true,
          recovered: false,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    /*
     * Nothing to process.
     */

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        revenueAtRisk: 0,
        expectedRecoveredRevenue: 0,

        summary: {
          approvedActions: 0,
          guardrailsOverridden: 0,
          reviewRequired: 0,
          waiting: 0,
          retries: 0,
          paymentLinks: 0,
        },

        results: [],

        message:
          "No recoverable failed payments found.",
      });
    }

    /* =====================================================
       STEP 2
       BUILD AI INPUT
       ===================================================== */

    const inputs: AIRecoveryInput[] = [];

    const transactionContexts: {
      transaction: (typeof transactions)[number];

      paymentEvent: {
        channel: string | null;
        provider: string | null;
        latencyMs: number | null;
      } | null;

      previousAttempts: number;
      previousRecoveries: number;

      incident: {
        id: string;
        severity: string;
        confidence: number | null;
        status: string;
        type: string;
      } | null;
    }[] = [];

    for (const transaction of transactions) {
      /*
       * Latest payment event for this transaction.
       */

      const paymentEvent =
        await prisma.paymentEvent.findFirst({
          where: {
            transactionId: transaction.id,
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      /*
       * Previous recovery attempts.
       */

      const previousAttempts =
        await prisma.recoveryEvent.count({
          where: {
            transactionId: transaction.id,
          },
        });

      /*
       * Previous successful recoveries.
       */

      const previousRecoveries =
        await prisma.recoveryEvent.count({
          where: {
            transactionId: transaction.id,

            eventType: {
              in: [
                "PAYMENT_RECOVERED",
                "RECOVERY_SUCCESS",
              ],
            },
          },
        });

      /*
       * Find the most recent active incident.
       */

      const incident =
        await prisma.incident.findFirst({
          where: {
            status: {
              in: [
                "DETECTED",
                "INVESTIGATING",
                "ACTION_REQUIRED",
                "RECOVERING",
                "MONITORING",
              ],
            },
          },

          orderBy: {
            detectedAt: "desc",
          },
        });

      const input: AIRecoveryInput = {
        paymentId:
          transaction.paymentId,

        customerEmail:
          transaction.customerEmail,

        amount:
          transaction.amount,

        currency:
          transaction.currency,

        failureReason:
          transaction.failureReason,

        channel:
          paymentEvent?.channel ?? null,

        provider:
          paymentEvent?.provider ?? null,

        latencyMs:
          paymentEvent?.latencyMs ?? null,

        incidentSeverity:
          incident?.severity ?? null,

        incidentConfidence:
          incident?.confidence ?? null,

        previousAttempts,

        previousRecoveries,
      };

      inputs.push(input);

      transactionContexts.push({
        transaction,

        paymentEvent: paymentEvent
          ? {
              channel:
                paymentEvent.channel,

              provider:
                paymentEvent.provider,

              latencyMs:
                paymentEvent.latencyMs,
            }
          : null,

        previousAttempts,

        previousRecoveries,

        incident: incident
          ? {
              id: incident.id,

              severity:
                incident.severity,

              confidence:
                incident.confidence,

              status:
                incident.status,

              type:
                incident.type,
            }
          : null,
      });
    }

    /* =====================================================
       STEP 3
       ONE BATCH AI ANALYSIS
       ===================================================== */

    const decisions =
      await analyzeRecoveryBatch(inputs);

    /*
     * Safety check.
     *
     * The AI must return one decision per transaction.
     */

    if (
      !Array.isArray(decisions) ||
      decisions.length !==
        transactions.length
    ) {
      throw new Error(
        `AI returned ${decisions?.length ?? 0} decisions for ${transactions.length} transactions.`
      );
    }

    /* =====================================================
       STEP 4
       PROCESS EACH DECISION
       ===================================================== */

    const results: Array<{
      transactionId: string;
      paymentId: string;
      customerEmail: string;
      amount: number;
      currency: string;
      failureReason: string | null;
      channel: string | null;
      provider: string | null;

      recommendation: RecoveryAction;

      recoveryProbability: number;
      expectedRecoveredRevenue: number;

      confidence: number;
      risk: string;
      reasoning: string;

      guardrails: GuardrailResult;

      orchestration: OrchestrationResult;

      simulated: true;
    }> = [];

    let approvedActions = 0;
    let guardrailsOverridden = 0;
    let reviewRequired = 0;
    let waiting = 0;
    let retries = 0;
    let paymentLinks = 0;

    /* =====================================================
       STEP 5
       ORCHESTRATE + PERSIST
       ===================================================== */

    for (
      let index = 0;
      index < transactions.length;
      index++
    ) {
      const transaction =
        transactions[index];

      const decision =
        decisions[index];

      const context =
        transactionContexts[index];

      /*
       * Normalize the AI recommendation.
       */

      const originalAction =
        normalizeRecoveryAction(
          decision.recommendedAction
        );

      /*
       * RECOVR guardrail state.
       *
       * Critical incidents force WAIT.
       */

      let finalAction =
        originalAction;

      const triggered: string[] = [];
      const guardrailReasons: string[] = [];

      const incidentIsCritical =
        context.incident?.severity ===
        "CRITICAL";

      if (incidentIsCritical) {
        triggered.push(
          "CRITICAL_INCIDENT"
        );

        guardrailReasons.push(
          "Critical provider incident is active. Recovery is paused until conditions stabilize."
        );

        finalAction = "WAIT";
      }

      /*
       * Attempt limit.
       *
       * Six or more recovery events means
       * automated recovery must stop.
       */

      if (
        context.previousAttempts >= 6
      ) {
        triggered.push(
          "ATTEMPT_LIMIT"
        );

        guardrailReasons.push(
          "Recovery attempt limit reached. Additional automated attempts are paused."
        );

        finalAction = "WAIT";
      }

      /*
       * If the AI requested an unsafe action
       * during an active incident, record it
       * as a guardrail override.
       */

      const overridden =
        finalAction !==
        originalAction;

      if (overridden) {
        guardrailsOverridden++;
      }

      /*
       * If there are no blocking conditions,
       * the AI recommendation is approved.
       */

      const approved =
        finalAction !== "REVIEW";

      if (approved) {
        approvedActions++;
      }

      /*
       * Add generic approval reason.
       */

      if (
        finalAction === "WAIT" &&
        guardrailReasons.length === 0
      ) {
        guardrailReasons.push(
          "RECOVR determined that waiting is safer than initiating another recovery attempt."
        );
      }

      if (
        finalAction === "REVIEW"
      ) {
        reviewRequired++;
      }

      if (
        finalAction === "WAIT"
      ) {
        waiting++;
      }

      if (
        finalAction === "RETRY"
      ) {
        retries++;
      }

      if (
        finalAction === "PAYMENT_LINK"
      ) {
        paymentLinks++;
      }

      /*
       * Guardrail object returned to UI.
       */

      const guardrails: GuardrailResult = {
        originalAction,

        finalAction,

        overridden,

        approved,

        triggered,

        reasons:
          guardrailReasons,
      };

      /*
       * Add guardrail reasoning to the AI reasoning.
       */

      const finalReasoning =
        [
          decision.reasoning,

          ...guardrailReasons,
        ]
          .filter(Boolean)
          .join(" ");

      /* ===================================================
         STEP 6
         ORCHESTRATOR
         =================================================== */

      const orchestration =
        await orchestrateRecovery({
          transactionId:
            transaction.id,

          action:
            finalAction,

          reasoning:
            finalReasoning,
        });

      /*
       * ===================================================
       * STEP 7
       * PERSIST FINAL RECOVERY STATE
       * ===================================================
       *
       * This is the important part:
       *
       * AI decision
       *       ↓
       * Guardrail decision
       *       ↓
       * Orchestrator
       *       ↓
       * Transaction database
       */

      const recoveryAction =
        getRecoveryActionFromStatus(
          orchestration.recoveryStatus
        );

      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },

          data: {
            recommendation:
              finalAction,

            confidence:
              decision.confidence * 100,

            reason:
              finalReasoning,

            recoveryStatus:
              orchestration.recoveryStatus,

            recoveryAction:
              recoveryAction,
          },
        });

      /* ===================================================
         STEP 8
         AUDIT EVENT
         =================================================== */

      await prisma.recoveryEvent.create({
        data: {
          transactionId:
            transaction.id,

          eventType:
            "AI_RECOVERY_DECISION",

          action:
            finalAction,

          message:
            `RECOVR AI recommended ${originalAction}. Final action: ${finalAction}. ${finalReasoning}`,
        },
      });

      /* ===================================================
         STEP 9
         BUILD API RESULT
         =================================================== */

      results.push({
        transactionId:
          updated.id,

        paymentId:
          updated.paymentId,

        customerEmail:
          updated.customerEmail,

        amount:
          updated.amount,

        currency:
          updated.currency,

        failureReason:
          updated.failureReason,

        channel:
          context.paymentEvent
            ?.channel ?? null,

        provider:
          context.paymentEvent
            ?.provider ?? null,

        recommendation:
          finalAction,

        recoveryProbability:
          Number(
            decision.recoveryProbability
          ),

        expectedRecoveredRevenue:
          Number(
            decision.expectedRecoveredRevenue.toFixed(
              2
            )
          ),

        confidence:
          Number(
            decision.confidence
          ),

        risk:
          decision.risk,

        reasoning:
          finalReasoning,

        guardrails,

        orchestration,

        simulated: true,
      });
    }

    /* =====================================================
       STEP 10
       SUMMARY METRICS
       ===================================================== */

    const totalRevenueAtRisk =
      results.reduce(
        (sum, item) =>
          sum + item.amount,
        0
      );

    const expectedRecoveredRevenue =
      results.reduce(
        (sum, item) =>
          sum +
          item.expectedRecoveredRevenue,
        0
      );

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json({
      success: true,

      processed:
        results.length,

      revenueAtRisk:
        totalRevenueAtRisk,

      expectedRecoveredRevenue:
        Number(
          expectedRecoveredRevenue.toFixed(
            2
          )
        ),

      summary: {
        approvedActions,

        guardrailsOverridden,

        reviewRequired,

        waiting,

        retries,

        paymentLinks,
      },

      results,
    });
  } catch (error) {
    console.error(
      "POST /api/recovery/ai error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "AI recovery analysis failed.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   GET
   ========================================================= */

export async function GET() {
  return NextResponse.json({
    success: true,

    message:
      "RECOVR Batch AI Recovery Engine, Guardrails and Recovery Orchestrator are ready. Send a POST request to analyze recoverable failed payments.",
  });
}