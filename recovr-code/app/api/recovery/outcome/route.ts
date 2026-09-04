import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type OutcomeRequest = {
  transactionId?: string;
};

function calculateRecoveryProbability(
  action: string | null
) {
  switch (action) {
    case "CONTROLLED_RETRY":
      return 0.70;

    case "PAYMENT_LINK":
      return 0.45;

    default:
      return 0;
  }
}

/*
 * Deterministic simulation.
 *
 * We intentionally do NOT use Math.random().
 * Evaluating the same transaction + action
 * therefore produces the same result every time.
 */
function deterministicScore(input: string) {
  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    hash =
      (hash * 31 +
        input.charCodeAt(i)) |
      0;
  }

  return (
    Math.abs(hash) % 1000
  ) / 1000;
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as OutcomeRequest;

    const transactionId =
      body.transactionId;

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,

          error:
            "transactionId is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Load recovery case.
     */
    const transaction =
      await prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },

        include: {
          recoveryEvents: {
            orderBy: {
              createdAt: "desc",
            },

            take: 10,
          },
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Recovery case not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Already recovered.
     */
    if (
      transaction.recovered ||
      transaction.recoveryStatus ===
        "RECOVERED"
    ) {
      return NextResponse.json({
        success: true,

        alreadyEvaluated: true,

        outcome: "RECOVERED",

        recovered: true,

        recoveredAmount:
          transaction.recoveredAmount ??
          transaction.amount,
      });
    }

    /*
     * Only executed/scheduled recovery actions
     * can have an outcome evaluated.
     */
    const executableStates = [
      "EXECUTED",
      "RETRY_SCHEDULED",
      "PAYMENT_LINK_GENERATED",
    ];

    if (
      !executableStates.includes(
        transaction.recoveryStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "No executed recovery action is available for this case.",
        },
        {
          status: 400,
        }
      );
    }

    const action =
      transaction.recoveryAction;

    const probability =
      calculateRecoveryProbability(
        action
      );

    /*
     * Generate deterministic score.
     */
    const score =
      deterministicScore(
        transaction.id +
          transaction.paymentId +
          (action ?? "")
      );

    /*
     * Simulation outcome.
     */
    const recovered =
      score < probability;

    /*
     * =====================================================
     * RECOVERY SUCCESS
     * =====================================================
     */
    if (recovered) {
      const recoveredAmount =
        transaction.amount;

      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },

          data: {
            recovered: true,

            recoveredAmount,

            recoveredAt:
              new Date(),

            recoveryStatus:
              "RECOVERED",

            recommendation:
              "NO_ACTION",

            reason:
              "Recovery action successfully recovered the payment.",

            recoveryEvents: {
              create: {
                eventType:
                  "RECOVERY_OUTCOME",

                action:
                  action,

                message:
                  `Recovery outcome verified successfully. ₹${recoveredAmount.toLocaleString(
                    "en-IN"
                  )} recovered in simulation mode.`,
              },
            },
          },
        });

      return NextResponse.json({
        success: true,

        outcome:
          "RECOVERED",

        recovered: true,

        recoveredAmount,

        probability,

        score,

        transaction:
          updated,
      });
    }

    /*
     * =====================================================
     * RECOVERY FAILURE
     * =====================================================
     */
    const updated =
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          recovered: false,

          recoveredAmount: null,

          recoveredAt: null,

          recoveryStatus:
            "RECOVERY_FAILED",

          reason:
            "The executed recovery action did not recover the payment.",

          recoveryEvents: {
            create: {
              eventType:
                "RECOVERY_OUTCOME",

              action:
                action,

              message:
                `Recovery outcome evaluated. ${
                  action ??
                  "Recovery action"
                } did not recover the payment in simulation mode.`,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,

      outcome:
        "RECOVERY_FAILED",

      recovered: false,

      recoveredAmount: 0,

      probability,

      score,

      transaction:
        updated,
    });
  } catch (error) {
    console.error(
      "Recovery outcome error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to evaluate recovery outcome.",
      },
      {
        status: 500,
      }
    );
  }
}