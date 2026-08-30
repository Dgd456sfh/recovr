import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { runTriage } from "@/lib/triage";

export async function GET() {
  try {
    const incidents = await prisma.incident.findMany({
      orderBy: {
        detectedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error) {
    console.error("GET /api/incidents error:", error);

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

export async function POST() {
  try {
    const result = await runTriage();

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/incidents error:", error);

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