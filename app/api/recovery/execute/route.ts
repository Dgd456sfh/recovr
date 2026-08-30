import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ExecuteRequest = {
  transactionId?: string;
};

type RecoveryAction =
  | "CONTROLLED_RETRY"
  | "PAYMENT_LINK"
  | "NO_ACTION";

function normalizeAction(value: unknown): RecoveryAction | null {
  if (typeof value !== "string") return null;

  const action = value.trim().toUpperCase();

  if (
    action === "CONTROLLED_RETRY" ||
    action === "RETRY"
  ) {
    return "CONTROLLED_RETRY";
  }

  if (
    action === "PAYMENT_LINK" ||
    action === "PAYMENT_LINK_GENERATED"
  ) {
    return "PAYMENT_LINK";
  }

  if (action === "NO_ACTION") {
    return "NO_ACTION";
  }

  return null;
}

function getAction(
  recoveryAction: unknown,
  recommendation: unknown,
): RecoveryAction | null {
  return (
    normalizeAction(recoveryAction) ??
    normalizeAction(recommendation)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExecuteRequest;

    const transactionId = body.transactionId?.trim();

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: "transactionId is required.",
        },
        { status: 400 },
      );
    }

    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
      include: {
        recoveryEvents: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found.",
        },
        { status: 404 },
      );
    }

    /*
     * If the payment has already been recovered,
     * do not execute another recovery action.
     */
    if (transaction.recovered) {
      return NextResponse.json({
        success: true,
        executed: false,
        alreadyRecovered: true,
        action: transaction.recoveryAction,
        transaction,
        message:
          "Payment has already been successfully recovered.",
      });
    }

    /*
     * Find the action from the transaction's existing
     * recovery decision.
     */
    const action = getAction(
      transaction.recoveryAction,
      transaction.recommendation,
    );

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid recovery action found for this transaction.",
          availableActions: [
            "CONTROLLED_RETRY",
            "PAYMENT_LINK",
            "NO_ACTION",
          ],
          transactionId: transaction.id,
        },
        { status: 400 },
      );
    }

    /*
     * NO_ACTION
     */
    if (action === "NO_ACTION") {
      const updated = await prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          recoveryStatus: "NO_ACTION",
          recoveryAction: "NO_ACTION",
          recommendation: "NO_ACTION",
          reason:
            "RECOVR determined that no recovery action should be executed.",
        },
        include: {
          recoveryEvents: {
            orderBy: {
              createdAt: "desc",
            },
            take: 20,
          },
        },
      });

      return NextResponse.json({
        success: true,
        executed: false,
        action: "NO_ACTION",
        transaction: updated,
        message: "No recovery action was required.",
      });
    }

    /*
     * CONTROLLED RETRY
     *
     * In the current simulation environment we do not
     * perform a real payment attempt.
     */
    if (action === "CONTROLLED_RETRY") {
      const expectedRecovery = Math.round(
        transaction.amount * 0.82 * 100,
      ) / 100;

      const event = await prisma.recoveryEvent.create({
        data: {
          transactionId: transaction.id,
          eventType: "AUTONOMOUS_RECOVERY",
          action: "CONTROLLED_RETRY",
          message:
            `RECOVR autonomously executed CONTROLLED_RETRY. ` +
            `Recovery retry simulated. Expected recovered revenue: ₹${expectedRecovery.toFixed(
              2,
            )}.`,
        },
      });

      const updated = await prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          recoveryStatus: "RETRY_SCHEDULED",
          recoveryAction: "CONTROLLED_RETRY",
          recommendation: "RETRY",
          reason:
            "A controlled retry has been scheduled in simulation mode. No real payment was attempted.",
        },
        include: {
          recoveryEvents: {
            orderBy: {
              createdAt: "desc",
            },
            take: 20,
          },
        },
      });

      return NextResponse.json({
        success: true,
        executed: true,
        action: "CONTROLLED_RETRY",
        simulation: true,
        expectedRecoveredRevenue: expectedRecovery,
        event,
        transaction: updated,
        message:
          "Controlled retry scheduled successfully in simulation mode.",
      });
    }

    /*
     * PAYMENT LINK
     *
     * No real Razorpay payment link is created here.
     * This is intentionally simulation-safe.
     */
    if (action === "PAYMENT_LINK") {
      const event = await prisma.recoveryEvent.create({
        data: {
          transactionId: transaction.id,
          eventType: "AUTONOMOUS_RECOVERY",
          action: "PAYMENT_LINK",
          message:
            "RECOVR autonomously executed PAYMENT_LINK. Payment link recovery simulated. No real payment link was created.",
        },
      });

      const updated = await prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          recoveryStatus: "PAYMENT_LINK_GENERATED",
          recoveryAction: "PAYMENT_LINK",
          recommendation: "PAYMENT_LINK",
          reason:
            "A payment link recovery action was executed in simulation mode. No real payment link was created.",
        },
        include: {
          recoveryEvents: {
            orderBy: {
              createdAt: "desc",
            },
            take: 20,
          },
        },
      });

      return NextResponse.json({
        success: true,
        executed: true,
        action: "PAYMENT_LINK",
        simulation: true,
        paymentLinkCreated: false,
        event,
        transaction: updated,
        message:
          "Payment-link recovery executed in simulation mode.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unsupported recovery action.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error(
      "RECOVR /api/recovery/execute error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute recovery action.",
      },
      { status: 500 },
    );
  }
}