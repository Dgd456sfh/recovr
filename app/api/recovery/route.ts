import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import Razorpay from "razorpay";

export const runtime = "nodejs";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/* =========================================================
   GET /api/recovery
   Load recovery cases for /cases page
========================================================= */

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

    return NextResponse.json({
      success: true,
      transactions,
      cases: transactions,
    });
  } catch (error) {
    console.error("GET /api/recovery error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load recovery cases.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST /api/recovery
   Verify real Razorpay recovery Payment Link
========================================================= */

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const transactionId =
      typeof body?.transactionId === "string"
        ? body.transactionId.trim()
        : "";

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: "transactionId is required.",
        },
        { status: 400 }
      );
    }

    const transaction =
      await prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },
        include: {
          recoveryEvents: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found.",
        },
        { status: 404 }
      );
    }

    /* Already recovered */

    if (transaction.recovered) {
      return NextResponse.json({
        success: true,
        outcome: "RECOVERED",
        recovered: true,
        recoveredAmount:
          transaction.recoveredAmount ??
          transaction.amount,
        transaction,
        message:
          "Transaction has already been recovered.",
      });
    }

    /* No payment link yet */

    if (!transaction.razorpayPaymentLinkId) {
      return NextResponse.json({
        success: true,
        outcome: "PENDING",
        recovered: false,
        recoveredAmount: 0,
        razorpayStatus: "not_created",
        transaction,
        message:
          "No Razorpay Payment Link exists for this recovery case.",
      });
    }

    /* Fetch real Razorpay Payment Link */

    let paymentLink: any;

    try {
      paymentLink =
        await razorpay.paymentLink.fetch(
          transaction.razorpayPaymentLinkId
        );
    } catch (error) {
      console.error(
        "RECOVR: Unable to fetch Razorpay Payment Link:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify Razorpay Payment Link.",
        },
        { status: 502 }
      );
    }

    console.log("RECOVR payment verification:", {
      transactionId: transaction.id,
      paymentLinkId: paymentLink.id,
      status: paymentLink.status,
    });

    /* =====================================================
       PAID
    ===================================================== */

    if (paymentLink.status === "paid") {
      const recoveredAmount =
        transaction.amount;

      const updated =
        await prisma.transaction.update({
          where: {
            id: transaction.id,
          },

          data: {
            status: "RECOVERED",

            recovered: true,

            recoveredAmount,

            recoveredAt: new Date(),

            recoveryStatus: "RECOVERED",

            reason:
              "Razorpay Payment Link is marked as paid.",
          },

          include: {
            recoveryEvents: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        });

      await prisma.recoveryEvent.create({
        data: {
          transactionId: transaction.id,

          eventType:
            "RECOVERY_OUTCOME",

          action:
            transaction.recoveryAction ||
            "PAYMENT_LINK",

          message:
            `Razorpay Payment Link ${paymentLink.id} ` +
            `is marked as paid. ` +
            `₹${recoveredAmount.toFixed(2)} recovered.`,
        },
      });

      return NextResponse.json({
        success: true,
        outcome: "RECOVERED",
        recovered: true,
        recoveredAmount,
        razorpayStatus:
          paymentLink.status,
        transaction: updated,
        message:
          "Razorpay confirms the recovery payment is paid.",
      });
    }

    /* =====================================================
       NOT PAID
    ===================================================== */

    return NextResponse.json({
      success: true,
      outcome: "PENDING",
      recovered: false,
      recoveredAmount: 0,
      razorpayStatus:
        paymentLink.status,
      transaction,
      message:
        "Razorpay has not marked the recovery Payment Link as paid yet.",
    });
  } catch (error) {
    console.error(
      "POST /api/recovery error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify recovery.",
      },
      { status: 500 }
    );
  }
}