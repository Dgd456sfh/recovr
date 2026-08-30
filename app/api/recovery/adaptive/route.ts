import { NextResponse } from "next/server";
import { getAdaptiveRecommendation } from "@/lib/recovery/adaptive-engine";

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

    const recommendation =
      await getAdaptiveRecommendation(
        transactionId
      );

    return NextResponse.json({
      success: true,

      engine: {
        name:
          "RECOVR Adaptive Recovery Engine",

        type:
          "OUTCOME_AWARE_DECISION_ENGINE",

        status: "ACTIVE",
      },

      recommendation,
    });
  } catch (error) {
    console.error(
      "Adaptive recovery error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate adaptive recommendation.",
      },
      {
        status: 500,
      }
    );
  }
}