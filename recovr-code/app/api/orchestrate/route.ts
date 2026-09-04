import { NextResponse } from "next/server";
import { runOrchestrator } from "@/lib/orchestrator";

export async function POST() {
  try {
    const result = await runOrchestrator();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("POST /api/orchestrate error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Orchestration failed.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message:
      "Recovr Incident Orchestrator is running. Send a POST request to execute the recovery pipeline.",
  });
}