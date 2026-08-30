import { NextResponse } from "next/server";
import {
  runAutonomousRecovery,
} from "@/lib/recovery/autonomous-orchestrator";

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
      await runAutonomousRecovery(
        transactionId
      );

    return NextResponse.json({
      success: true,

      engine: {
        name:
          "RECOVR Autonomous Recovery Orchestrator",

        type:
          "GUARDRAILED_AUTONOMOUS_AGENT",

        status: "ACTIVE",
      },

      result,
    });
  } catch (error) {
    console.error(
      "Autonomous recovery error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Autonomous recovery failed.",
      },
      {
        status: 500,
      }
    );
  }
}