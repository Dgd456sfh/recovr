import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/recovery/cases
 *
 * Returns all recovery cases for the RECOVR Cases page.
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

    const totalTransactions = transactions.length;

    const failedTransactions = transactions.filter(
      (transaction) =>
        !transaction.recovered &&
        transaction.recoverable === true
    );

    const recoveredTransactions = transactions.filter(
      (transaction) => transaction.recovered === true
    );

    const revenueAtRisk = failedTransactions.reduce(
      (total, transaction) => {
        return total + Number(transaction.amount || 0);
      },
      0
    );

    const recoveredRevenue = recoveredTransactions.reduce(
      (total, transaction) => {
        return (
          total +
          Number(
            transaction.recoveredAmount ??
              transaction.amount ??
              0
          )
        );
      },
      0
    );

    const recoveryRate =
      totalTransactions > 0
        ? Math.round(
            (recoveredTransactions.length /
              totalTransactions) *
              100
          )
        : 0;

    return NextResponse.json({
      success: true,

      summary: {
        totalTransactions,
        totalCases: transactions.length,
        failedTransactions: failedTransactions.length,
        recoveredTransactions:
          recoveredTransactions.length,
        revenueAtRisk,
        recoveredRevenue,
        recoveryRate,
      },

      cases: transactions,
    });
  } catch (error) {
    console.error(
      "GET /api/recovery/cases error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load recovery cases.",
        summary: {
          totalTransactions: 0,
          totalCases: 0,
          failedTransactions: 0,
          recoveredTransactions: 0,
          revenueAtRisk: 0,
          recoveredRevenue: 0,
          recoveryRate: 0,
        },
        cases: [],
      },
      {
        status: 500,
      }
    );
  }
}