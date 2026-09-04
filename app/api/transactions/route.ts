import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/*
 * GET
 * Fetch all transactions
 */
export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        recoveryEvents: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("GET /api/transactions error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transactions",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * POST
 * Create a demo failed transaction
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      customerEmail,
      amount,
      currency = "INR",
      failureReason = "UNKNOWN",
    } = body;

    /*
     * Basic validation
     */
    if (!customerEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "customerEmail is required",
        },
        { status: 400 }
      );
    }

    if (
      amount === undefined ||
      amount === null ||
      Number(amount) <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "amount must be greater than 0",
        },
        { status: 400 }
      );
    }

    /*
     * Generate a demo payment ID.
     */
    const paymentId = `pay_test_${Date.now()}_${Math.floor(
      Math.random() * 1000
    )}`;

    /*
     * Create failed transaction.
     */
    const transaction = await prisma.transaction.create({
      data: {
        paymentId,
        customerEmail,
        amount: Number(amount),
        currency,

        status: "FAILED",

        failureReason,

        recoverable: true,
        recovered: false,

        recoveryStatus: "PENDING",
        recoveryAction: null,

        recommendation: "PAYMENT_LINK",
        confidence: 0.95,

        reason:
          "Demo failed payment created for RECOVR recovery.",

        recoveredAmount: null,
        recoveredAt: null,

        recoveryEvents: {
          create: {
            eventType: "PAYMENT_FAILED",
            action: "DETECT",
            message:
              "Test failed payment created for RECOVR recovery.",
          },
        },
      },

      include: {
        recoveryEvents: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        transaction,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST /api/transactions error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create transaction.",
      },
      {
        status: 500,
      }
    );
  }
}