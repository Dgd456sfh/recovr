import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createPaymentEvents } from "@/lib/payment-events";

export async function GET() {
  try {
    const events = await prisma.paymentEvent.findMany({
      include: {
        transaction: {
          select: {
            paymentId: true,
            customerEmail: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error(
      "GET /api/payment-events error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payment events.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST() {
  try {
    const results = await createPaymentEvents();

    return NextResponse.json({
      success: true,
      message:
        "Payment events generated successfully.",
      results,
    });
  } catch (error) {
    console.error(
      "POST /api/payment-events error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate payment events.",
      },
      {
        status: 500,
      }
    );
  }
}