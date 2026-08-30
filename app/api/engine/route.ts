import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  evaluateRecovery,
  type RecoveryTransaction,
} from "@/lib/recovery/engine";

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const results = [];

    for (const transaction of transactions) {
      const input: RecoveryTransaction = {
        id: transaction.id,
        paymentId: transaction.paymentId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        failureReason: transaction.failureReason,
        recoverable: transaction.recoverable,
        recovered: transaction.recovered,
        recoveryStatus: transaction.recoveryStatus,
        recoveryAction: transaction.recoveryAction,
      };

      const decision = evaluateRecovery(input);

      const updated = await prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          recommendation: decision.recommendation,
          confidence: decision.confidence,
          reason: decision.reason,
        },
      });

      results.push({
        transaction: updated,
        decision,
      });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Recovery engine error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Recovery engine failed.",
      },
      {
        status: 500,
      }
    );
  }
}