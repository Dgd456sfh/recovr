import { prisma } from "@/lib/db/prisma";

function getChannel(paymentId: string): string {
  const channels = ["UPI", "CARD", "NETBANKING", "WALLET"];

  const lastCharacter = paymentId.charCodeAt(
    paymentId.length - 1
  );

  return channels[lastCharacter % channels.length];
}

function getProvider(channel: string): string {
  if (channel === "UPI") {
    return "UPI_PROVIDER_A";
  }

  if (channel === "CARD") {
    return "CARD_PROVIDER_A";
  }

  if (channel === "NETBANKING") {
    return "BANK_PROVIDER_A";
  }

  return "WALLET_PROVIDER_A";
}

function getFailureCode(
  failureReason: string | null
): string | null {
  if (!failureReason) {
    return null;
  }

  const reason = failureReason.toLowerCase();

  if (reason.includes("timeout")) {
    return "BANK_TIMEOUT";
  }

  if (reason.includes("insufficient")) {
    return "INSUFFICIENT_FUNDS";
  }

  if (reason.includes("declined")) {
    return "CARD_DECLINED";
  }

  return "UNKNOWN_FAILURE";
}

function getLatency(paymentId: string): number {
  const lastCharacter = paymentId.charCodeAt(
    paymentId.length - 1
  );

  return 150 + (lastCharacter % 10) * 75;
}

export async function createPaymentEvents() {
  const transactions = await prisma.transaction.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  const results = [];

  for (const transaction of transactions) {
    const existingEvent =
      await prisma.paymentEvent.findFirst({
        where: {
          transactionId: transaction.id,
        },
      });

    if (existingEvent) {
      results.push({
        paymentId: transaction.paymentId,
        status: "ALREADY_EXISTS",
      });

      continue;
    }

    const channel = getChannel(transaction.paymentId);

    const event = await prisma.paymentEvent.create({
      data: {
        transactionId: transaction.id,

        eventType:
          transaction.status === "SUCCESS"
            ? "PAYMENT_SUCCESS"
            : "PAYMENT_FAILED",

        channel,

        provider: getProvider(channel),

        status: transaction.status,

        failureCode: getFailureCode(
          transaction.failureReason
        ),

        latencyMs: getLatency(
          transaction.paymentId
        ),

        amount: transaction.amount,

        currency: transaction.currency,
      },
    });

    results.push({
      paymentId: transaction.paymentId,
      eventId: event.id,
      status: "CREATED",
    });
  }

  return results;
}