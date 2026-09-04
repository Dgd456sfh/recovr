import { prisma } from "@/lib/db/prisma";

export type AnalyticsSummary = {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  successRate: number;
  failureRate: number;
  totalVolume: number;
  failedVolume: number;
  recoverableVolume: number;
  averageLatencyMs: number;
};

export type FailureBreakdown = {
  label: string;
  count: number;
  amount: number;
  percentage: number;
};

export type ProviderBreakdown = {
  provider: string;
  total: number;
  failed: number;
  successRate: number;
};

export type ChannelBreakdown = {
  channel: string;
  total: number;
  failed: number;
  successRate: number;
};

export type AnalyticsResult = {
  success: true;
  generatedAt: string;
  window: {
    hours: number;
    from: string;
    to: string;
  };
  summary: AnalyticsSummary;
  failures: FailureBreakdown[];
  providers: ProviderBreakdown[];
  channels: ChannelBreakdown[];
  timeline: {
    timestamp: string;
    total: number;
    successful: number;
    failed: number;
    amount: number;
    failedAmount: number;
  }[];
};

function round(value: number, decimals = 2) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function percentage(
  numerator: number,
  denominator: number
) {
  if (denominator <= 0) return 0;

  return round(
    (numerator / denominator) * 100
  );
}

export async function getAnalytics(
  hours = 24
): Promise<AnalyticsResult> {
  const safeHours = Math.min(
    Math.max(Math.floor(hours), 1),
    168
  );

  const now = new Date();

  const from = new Date(
    now.getTime() -
      safeHours * 60 * 60 * 1000
  );

  const events =
    await prisma.paymentEvent.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: now,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

  const totalEvents = events.length;

  const successfulEvents =
    events.filter(
      (event) =>
        isSuccessfulStatus(event.status)
    ).length;

  const failedEvents =
    events.filter(
      (event) =>
        isFailedStatus(event.status)
    ).length;

  const totalVolume = events.reduce(
    (sum, event) =>
      sum + Number(event.amount || 0),
    0
  );

  const failedVolume = events
    .filter((event) =>
      isFailedStatus(event.status)
    )
    .reduce(
      (sum, event) =>
        sum + Number(event.amount || 0),
      0
    );

  const recoverableTransactions =
    await prisma.transaction.findMany({
      where: {
        status: "FAILED",
        recoverable: true,
        recovered: false,
      },
      select: {
        amount: true,
      },
    });

  const recoverableVolume =
    recoverableTransactions.reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount || 0),
      0
    );

  const latencyValues = events
    .map((event) => event.latencyMs)
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value)
    );

  const averageLatencyMs =
    latencyValues.length > 0
      ? round(
          latencyValues.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / latencyValues.length
        )
      : 0;

  const failures =
    buildFailureBreakdown(events);

  const providers =
    buildProviderBreakdown(events);

  const channels =
    buildChannelBreakdown(events);

  const timeline =
    buildTimeline(events, from, now);

  return {
    success: true,

    generatedAt:
      new Date().toISOString(),

    window: {
      hours: safeHours,
      from: from.toISOString(),
      to: now.toISOString(),
    },

    summary: {
      totalEvents,

      successfulEvents,

      failedEvents,

      successRate: percentage(
        successfulEvents,
        totalEvents
      ),

      failureRate: percentage(
        failedEvents,
        totalEvents
      ),

      totalVolume: round(
        totalVolume
      ),

      failedVolume: round(
        failedVolume
      ),

      recoverableVolume: round(
        recoverableVolume
      ),

      averageLatencyMs,
    },

    failures,

    providers,

    channels,

    timeline,
  };
}

function isSuccessfulStatus(
  status: string
) {
  const normalized =
    status.toUpperCase();

  return [
    "SUCCESS",
    "SUCCEEDED",
    "CAPTURED",
    "PAID",
    "COMPLETED",
  ].includes(normalized);
}

function isFailedStatus(
  status: string
) {
  const normalized =
    status.toUpperCase();

  return [
    "FAILED",
    "FAILURE",
    "DECLINED",
    "ERROR",
    "TIMEOUT",
  ].includes(normalized);
}

function buildFailureBreakdown(
  events: Array<{
    status: string;
    failureCode: string | null;
    amount: number;
  }>
): FailureBreakdown[] {
  const groups = new Map<
    string,
    {
      count: number;
      amount: number;
    }
  >();

  for (const event of events) {
    if (!isFailedStatus(event.status)) {
      continue;
    }

    const label =
      event.failureCode?.trim() ||
      event.status ||
      "UNKNOWN";

    const current =
      groups.get(label) || {
        count: 0,
        amount: 0,
      };

    current.count += 1;

    current.amount += Number(
      event.amount || 0
    );

    groups.set(label, current);
  }

  const totalFailed =
    Array.from(groups.values()).reduce(
      (sum, item) =>
        sum + item.count,
      0
    );

  return Array.from(groups.entries())
    .map(([label, value]) => ({
      label,

      count: value.count,

      amount: round(
        value.amount
      ),

      percentage: percentage(
        value.count,
        totalFailed
      ),
    }))
    .sort(
      (a, b) =>
        b.count - a.count
    );
}

function buildProviderBreakdown(
  events: Array<{
    provider: string | null;
    status: string;
  }>
): ProviderBreakdown[] {
  const groups = new Map<
    string,
    {
      total: number;
      failed: number;
    }
  >();

  for (const event of events) {
    const provider =
      event.provider?.trim() ||
      "Unknown";

    const current =
      groups.get(provider) || {
        total: 0,
        failed: 0,
      };

    current.total += 1;

    if (isFailedStatus(event.status)) {
      current.failed += 1;
    }

    groups.set(
      provider,
      current
    );
  }

  return Array.from(groups.entries())
    .map(([provider, value]) => ({
      provider,

      total: value.total,

      failed: value.failed,

      successRate: percentage(
        value.total - value.failed,
        value.total
      ),
    }))
    .sort(
      (a, b) =>
        b.total - a.total
    );
}

function buildChannelBreakdown(
  events: Array<{
    channel: string | null;
    status: string;
  }>
): ChannelBreakdown[] {
  const groups = new Map<
    string,
    {
      total: number;
      failed: number;
    }
  >();

  for (const event of events) {
    const channel =
      event.channel?.trim() ||
      "Unknown";

    const current =
      groups.get(channel) || {
        total: 0,
        failed: 0,
      };

    current.total += 1;

    if (isFailedStatus(event.status)) {
      current.failed += 1;
    }

    groups.set(
      channel,
      current
    );
  }

  return Array.from(groups.entries())
    .map(([channel, value]) => ({
      channel,

      total: value.total,

      failed: value.failed,

      successRate: percentage(
        value.total - value.failed,
        value.total
      ),
    }))
    .sort(
      (a, b) =>
        b.total - a.total
    );
}

function buildTimeline(
  events: Array<{
    createdAt: Date;
    status: string;
    amount: number;
  }>,
  from: Date,
  now: Date
) {
  const bucketCount = 12;

  const bucketSize =
    (now.getTime() -
      from.getTime()) /
    bucketCount;

  const buckets = Array.from(
    { length: bucketCount },
    (_, index) => ({
      timestamp: new Date(
        from.getTime() +
          index * bucketSize
      ).toISOString(),

      total: 0,

      successful: 0,

      failed: 0,

      amount: 0,

      failedAmount: 0,
    })
  );

  for (const event of events) {
    const offset =
      event.createdAt.getTime() -
      from.getTime();

    let index = Math.floor(
      offset / bucketSize
    );

    if (index < 0) index = 0;

    if (index >= bucketCount) {
      index = bucketCount - 1;
    }

    const bucket = buckets[index];

    bucket.total += 1;

    bucket.amount += Number(
      event.amount || 0
    );

    if (
      isSuccessfulStatus(
        event.status
      )
    ) {
      bucket.successful += 1;
    }

    if (
      isFailedStatus(
        event.status
      )
    ) {
      bucket.failed += 1;

      bucket.failedAmount +=
        Number(event.amount || 0);
    }
  }

  return buckets.map((bucket) => ({
    ...bucket,

    amount: round(
      bucket.amount
    ),

    failedAmount: round(
      bucket.failedAmount
    ),
  }));
}