import { NextResponse } from "next/server";
import { getRecoveryLearning } from "@/lib/recovery/learning-engine";

export async function GET() {
  try {
    const learning =
      await getRecoveryLearning();

    return NextResponse.json({
      success: true,

      model: {
        name: "RECOVR Recovery Learning Engine",
        type: "OUTCOME_BASED_POLICY_LEARNING",
        status: "ACTIVE",
      },

      learning,
    });
  } catch (error) {
    console.error(
      "Recovery learning error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to calculate recovery learning.",
      },
      {
        status: 500,
      }
    );
  }
}