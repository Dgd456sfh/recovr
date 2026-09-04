import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/* =========================================================
   TYPES
   ========================================================= */

type FailureAnalytics = {
  label: string;
  count: number;
  amount: number;
  percentage: number;
};

type ProviderAnalytics = {
  provider: string;
  total: number;
  failed: number;
  successRate: number;
};

type ChannelAnalytics = {
  channel: string;
  total: number;
  failed: number;
  successRate: number;
};

type TimelineAnalytics = {
  timestamp: string;
  total: number;
  successful: number;
  failed: number;
  amount: number;
  failedAmount: number;
};

/* =========================================================
   HELPERS
   ========================================================= */

function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function calculateRate(
  successful: number,
  total: number
): number {
  if (total === 0) {
    return 0;
  }

  return round((successful / total) * 100, 1);
}

function normalizeLabel(
  value: string | null | undefined
): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^./, (char) =>
      char.toUpperCase()
    );
}

/* =========================================================
   GET /api/analytics
   ========================================================= */

export async function GET() {
  try {
    /*
     * Analytics window.
     *
     * We use the last 24 hours for the timeline,
     * while summary metrics are calculated from the
     * transactions available in the database.
     */

    const now = new Date();

    const from = new Date(
      now.getTime() -
        24 * 60 * 60 * 1000
    );

    /*
     * Load transactions and payment events.
     *
     * These relations exist in the current Prisma schema.
     */

    const transactions =
      await prisma.transaction.findMany({
        include: {
          paymentEvents: {
            orderBy: {
              createdAt: "desc",
            },
          },

          recoveryEvents: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    /* =====================================================
       BASIC SUMMARY
       ===================================================== */

    const totalEvents =
      transactions.length;

    const successfulEvents =
      transactions.filter(
        (transaction) =>
          transaction.status === "SUCCESS"
      ).length;

    const failedEvents =
      transactions.filter(
        (transaction) =>
          transaction.status === "FAILED"
      ).length;

    const successRate =
      calculateRate(
        successfulEvents,
        totalEvents
      );

    const failureRate =
      calculateRate(
        failedEvents,
        totalEvents
      );

    /* =====================================================
       REVENUE
       ===================================================== */

    const totalVolume =
      transactions.reduce(
        (sum, transaction) =>
          sum +
          Number(transaction.amount || 0),
        0
      );

    const failedVolume =
      transactions
        .filter(
          (transaction) =>
            transaction.status === "FAILED"
        )
        .reduce(
          (sum, transaction) =>
            sum +
            Number(transaction.amount || 0),
          0
        );

    const recoverableVolume =
      transactions
        .filter(
          (transaction) =>
            transaction.status === "FAILED" &&
            transaction.recoverable &&
            !transaction.recovered
        )
        .reduce(
          (sum, transaction) =>
            sum +
            Number(transaction.amount || 0),
          0
        );

    /* =====================================================
       LATENCY
       ===================================================== */

    const latencyValues =
      transactions
        .flatMap(
          (transaction) =>
            transaction.paymentEvents
        )
        .map(
          (event) =>
            event.latencyMs
        )
        .filter(
          (
            latency
          ): latency is number =>
            typeof latency === "number" &&
            Number.isFinite(latency)
        );

    const averageLatencyMs =
      latencyValues.length > 0
        ? round(
            latencyValues.reduce(
              (sum, latency) =>
                sum + latency,
              0
            ) /
              latencyValues.length,
            0
          )
        : 0;

    /* =====================================================
       FAILURE ANALYTICS
       ===================================================== */

    const failureMap =
      new Map<
        string,
        {
          count: number;
          amount: number;
        }
      >();

    for (const transaction of transactions) {
      if (
        transaction.status !==
        "FAILED"
      ) {
        continue;
      }

      const label =
        normalizeLabel(
          transaction.failureReason
        );

      const existing =
        failureMap.get(label);

      if (existing) {
        existing.count += 1;

        existing.amount +=
          Number(transaction.amount || 0);
      } else {
        failureMap.set(label, {
          count: 1,
          amount:
            Number(transaction.amount || 0),
        });
      }
    }

    const failures: FailureAnalytics[] =
      Array.from(
        failureMap.entries()
      )
        .map(
          ([
            label,
            value,
          ]) => ({
            label,

            count:
              value.count,

            amount:
              round(value.amount),

            percentage:
              failedEvents > 0
                ? round(
                    (value.count /
                      failedEvents) *
                      100,
                    1
                  )
                : 0,
          })
        )
        .sort(
          (a, b) =>
            b.count -
            a.count
        );

    /* =====================================================
       PROVIDER ANALYTICS
       ===================================================== */

    const providerMap =
      new Map<
        string,
        {
          total: number;
          failed: number;
        }
      >();

    /*
     * Prefer PaymentEvent information because
     * provider is stored there.
     */

    for (const transaction of transactions) {
      if (
        transaction.paymentEvents.length ===
        0
      ) {
        continue;
      }

      const latestEvent =
        transaction.paymentEvents[0];

      const provider =
        normalizeLabel(
          latestEvent.provider
        );

      const existing =
        providerMap.get(provider);

      const failed =
        latestEvent.status ===
        "FAILED";

      if (existing) {
        existing.total += 1;

        if (failed) {
          existing.failed += 1;
        }
      } else {
        providerMap.set(provider, {
          total: 1,
          failed: failed
            ? 1
            : 0,
        });
      }
    }

    const providers: ProviderAnalytics[] =
      Array.from(
        providerMap.entries()
      )
        .map(
          ([
            provider,
            value,
          ]) => ({
            provider,

            total:
              value.total,

            failed:
              value.failed,

            successRate:
              calculateRate(
                value.total -
                  value.failed,
                value.total
              ),
          })
        )
        .sort(
          (a, b) =>
            b.total -
            a.total
        );

    /* =====================================================
       CHANNEL ANALYTICS
       ===================================================== */

    const channelMap =
      new Map<
        string,
        {
          total: number;
          failed: number;
        }
      >();

    for (const transaction of transactions) {
      if (
        transaction.paymentEvents.length ===
        0
      ) {
        continue;
      }

      const latestEvent =
        transaction.paymentEvents[0];

      const channel =
        normalizeLabel(
          latestEvent.channel
        );

      const existing =
        channelMap.get(channel);

      const failed =
        latestEvent.status ===
        "FAILED";

      if (existing) {
        existing.total += 1;

        if (failed) {
          existing.failed += 1;
        }
      } else {
        channelMap.set(channel, {
          total: 1,
          failed: failed
            ? 1
            : 0,
        });
      }
    }

    const channels: ChannelAnalytics[] =
      Array.from(
        channelMap.entries()
      )
        .map(
          ([
            channel,
            value,
          ]) => ({
            channel,

            total:
              value.total,

            failed:
              value.failed,

            successRate:
              calculateRate(
                value.total -
                  value.failed,
                value.total
              ),
          })
        )
        .sort(
          (a, b) =>
            b.total -
            a.total
        );

    /* =====================================================
       TIMELINE
       ===================================================== */

    /*
     * Group transactions into hourly buckets.
     */

    const timelineMap =
      new Map<
        string,
        {
          total: number;
          successful: number;
          failed: number;
          amount: number;
          failedAmount: number;
        }
      >();

    const timelineTransactions =
      transactions.filter(
        (transaction) => {
          const created =
            new Date(
              transaction.createdAt
            );

          return (
            created >= from &&
            created <= now
          );
        }
      );

    for (const transaction of timelineTransactions) {
      const created =
        new Date(
          transaction.createdAt
        );

      /*
       * Round timestamp down to the hour.
       */

      created.setMinutes(
        0,
        0,
        0
      );

      const key =
        created.toISOString();

      const existing =
        timelineMap.get(key);

      const amount =
        Number(
          transaction.amount || 0
        );

      const isSuccessful =
        transaction.status ===
        "SUCCESS";

      const isFailed =
        transaction.status ===
        "FAILED";

      if (existing) {
        existing.total += 1;

        if (isSuccessful) {
          existing.successful += 1;
        }

        if (isFailed) {
          existing.failed += 1;

          existing.failedAmount +=
            amount;
        }

        existing.amount +=
          amount;
      } else {
        timelineMap.set(key, {
          total: 1,

          successful:
            isSuccessful
              ? 1
              : 0,

          failed:
            isFailed
              ? 1
              : 0,

          amount,

          failedAmount:
            isFailed
              ? amount
              : 0,
        });
      }
    }

    const timeline: TimelineAnalytics[] =
      Array.from(
        timelineMap.entries()
      )
        .sort(
          (a, b) =>
            new Date(
              a[0]
            ).getTime() -
            new Date(
              b[0]
            ).getTime()
        )
        .map(
          ([
            timestamp,
            value,
          ]) => ({
            timestamp,

            total:
              value.total,

            successful:
              value.successful,

            failed:
              value.failed,

            amount:
              round(
                value.amount
              ),

            failedAmount:
              round(
                value.failedAmount
              ),
          })
        );

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json(
      {
        success: true,

        generatedAt:
          now.toISOString(),

        window: {
          hours: 24,

          from:
            from.toISOString(),

          to:
            now.toISOString(),
        },

        summary: {
          totalEvents,

          successfulEvents,

          failedEvents,

          successRate,

          failureRate,

          totalVolume:
            round(
              totalVolume
            ),

          failedVolume:
            round(
              failedVolume
            ),

          recoverableVolume:
            round(
              recoverableVolume
            ),

          averageLatencyMs,
        },

        failures,

        providers,

        channels,

        timeline,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "GET /api/analytics error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to load analytics.",
      },
      {
        status: 500,
      }
    );
  }
}