import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

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
        error: "Failed to fetch transactions",
      },
      {
        status: 500,
      }
    );
  }
}