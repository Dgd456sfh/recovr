import { prisma } from "@/lib/db/prisma";

export async function getAnalytics() {
  const events = await prisma.paymentEvent.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalEvents = events.length;

  const successfulEvents = events.filter(
    (event) => event.status === "SUCCESS"
  );

  const failedEvents = events.filter(
    (event) => event.status === "FAILED"
  );

  const successRate =
    totalEvents > 0
      ? Number(
          ((successfulEvents.length / totalEvents) * 100).toFixed(2)
        )
      : 0;

  const failureRate =
    totalEvents > 0
      ? Number(
          ((failedEvents.length / totalEvents) * 100).toFixed(2)
        )
      : 0;

  const revenueAtRisk = failedEvents.reduce(
    (total, event) => total + event.amount,
    0
  );

  const averageLatency =
    totalEvents > 0
      ? Math.round(
          events.reduce(
            (total, event) => total + (event.latencyMs ?? 0),
            0
          ) / totalEvents
        )
      : 0;

  const channelMap = new Map<
    string,
    {
      total: number;
      failed: number;
      amount: number;
    }
  >();

  const providerMap = new Map<
    string,
    {
      total: number;
      failed: number;
      amount: number;
    }
  >();

  for (const event of events) {
    const channel = event.channel ?? "UNKNOWN";
    const provider = event.provider ?? "UNKNOWN";

    const channelData = channelMap.get(channel) ?? {
      total: 0,
      failed: 0,
      amount: 0,
    };

    channelData.total += 1;

    if (event.status === "FAILED") {
      channelData.failed += 1;
      channelData.amount += event.amount;
    }

    channelMap.set(channel, channelData);

    const providerData = providerMap.get(provider) ?? {
      total: 0,
      failed: 0,
      amount: 0,
    };

    providerData.total += 1;

    if (event.status === "FAILED") {
      providerData.failed += 1;
      providerData.amount += event.amount;
    }

    providerMap.set(provider, providerData);
  }

  const channelBreakdown = Array.from(
    channelMap.entries()
  ).map(([channel, data]) => ({
    channel,
    totalEvents: data.total,
    failedEvents: data.failed,
    failureRate:
      data.total > 0
        ? Number(
            ((data.failed / data.total) * 100).toFixed(2)
          )
        : 0,
    revenueAtRisk: data.amount,
  }));

  const providerBreakdown = Array.from(
    providerMap.entries()
  ).map(([provider, data]) => ({
    provider,
    totalEvents: data.total,
    failedEvents: data.failed,
    failureRate:
      data.total > 0
        ? Number(
            ((data.failed / data.total) * 100).toFixed(2)
          )
        : 0,
    revenueAtRisk: data.amount,
  }));

  const failureCodes = new Map<string, number>();

  for (const event of failedEvents) {
    const code = event.failureCode ?? "UNKNOWN";

    failureCodes.set(
      code,
      (failureCodes.get(code) ?? 0) + 1
    );
  }

  const failureBreakdown = Array.from(
    failureCodes.entries()
  ).map(([failureCode, count]) => ({
    failureCode,
    count,
  }));

  return {
    overview: {
      totalEvents,
      successfulEvents: successfulEvents.length,
      failedEvents: failedEvents.length,
      successRate,
      failureRate,
      revenueAtRisk,
      averageLatency,
    },

    channelBreakdown,

    providerBreakdown,

    failureBreakdown,
  };
}