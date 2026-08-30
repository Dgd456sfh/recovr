import { NextResponse } from "next/server";
import { detectIncidents } from "@/lib/incident-detector";

export async function POST() {
  try {
    const result = await detectIncidents();

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/detect error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}