import { NextResponse } from "next/server";
import { calculateBaseline } from "@/lib/baseline";

export async function GET() {
  try {
    const baseline = await calculateBaseline();

    return NextResponse.json({
      success: true,
      baseline,
    });
  } catch (error) {
    console.error("GET /api/baseline error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate payment baseline.",
      },
      {
        status: 500,
      }
    );
  }
}