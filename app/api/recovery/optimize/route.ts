import { NextResponse } from "next/server";
import { optimizeRecoveryStrategy } from "@/lib/recovery/strategy-optimizer";

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    const { transactionId } = body;

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

    const result =
      await optimizeRecoveryStrategy(
        transactionId
      );

    return NextResponse.json({
      success: true,

      engine: {
        name:
          "RECOVR Strategy Optimizer",

        type:
          "MULTI_STRATEGY_RECOVERY_OPTIMIZATION",

        status: "ACTIVE",
      },

      result,
    });
  } catch (error) {
    console.error(
      "Strategy optimization error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to optimize recovery strategy.",
      },
      {
        status: 500,
      }
    );
  }
}