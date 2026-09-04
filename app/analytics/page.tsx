"use client";

import { useEffect, useMemo, useState } from "react";

/* =========================================================
   TYPES
   ========================================================= */

type Overview = {
  activeIncidents: number;
  totalIncidents: number;
  revenueAtRisk: number;
  recoverableRevenue: number;
  recoveredRevenue: number;
  recoveredCases: number;
  activeRecoveryCases: number;
  recoveryRate: number;
  currency: string;
};

type Health = {
  status: "HEALTHY" | "DEGRADED" | string;
  anomalyDetected: boolean;
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  successRate: number;
  failureRate: number;
  reason?: string | null;
};

type Incident = {
  id: string;
  type?: string;
  severity?: string;
  status?: string;
  confidence?: number | null;
  detectedAt?: string;
  resolvedAt?: string | null;
  description?: string | null;
  message?: string | null;
};

type RecoveryQueueItem = {
  id: string;
  paymentId: string;
  customerEmail: string;
  amount: number;
  currency: string;

  status: string;
  failureReason?: string | null;

  recoverable: boolean;
  recovered: boolean;

  recoveryStatus?: string | null;
  recoveryAction?: string | null;

  recommendation: string;
  confidence: number;
  priority: "HIGH" | "MEDIUM" | "LOW" | string;
  reason: string;
  shouldRecover: boolean;

  createdAt: string;
  updatedAt: string;
};

type ActivityItem = {
  id: string;
  transactionId: string;
  paymentId: string;
  customerEmail: string;

  type: string;
  action?: string | null;
  message: string;

  amount: number;
  createdAt: string;
};

type AnalyticsResponse = {
  success: boolean;
  generatedAt?: string;

  overview?: Overview;

  health?: Health;

  incidents?: {
    total: number;
    active: number;
    items: Incident[];
  };

  recoveryQueue?: {
    total: number;
    actionable: number;
    items: RecoveryQueueItem[];
  };

  activity?: {
    total: number;
    items: ActivityItem[];
  };

  error?: string;
};

/* =========================================================
   PAGE
   ========================================================= */

export default function AnalyticsPage() {
  const [data, setData] =
    useState<AnalyticsResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  /* =======================================================
     LOAD ANALYTICS
     ======================================================= */

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);

      /*
       * IMPORTANT:
       *
       * Your Command Center endpoint returns:
       *
       * overview
       * health
       * incidents
       * recoveryQueue
       * activity
       *
       * So analytics reads from that endpoint.
       */

      const response = await fetch(
        "/api/command-center",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        const text =
          await response.text();

        console.error(
          "Command Center API returned non-JSON:",
          text.slice(0, 500)
        );

        throw new Error(
          `API returned ${response.status}. Check /api/command-center.`
        );
      }

      const result =
        (await response.json()) as AnalyticsResponse;

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.error ||
            "Unable to load analytics."
        );
      }

      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(
        "RECOVR analytics loading error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load analytics."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics();

    /*
     * Refresh every 30 seconds.
     */

    const interval =
      setInterval(() => {
        void loadAnalytics();
      }, 30000);

    return () =>
      clearInterval(interval);
  }, []);

  /* =======================================================
     SAFE DEFAULTS
     ======================================================= */

  const overview =
    data?.overview;

  const health =
    data?.health;

  const incidents =
    data?.incidents?.items ?? [];

  const recoveryQueue =
    data?.recoveryQueue?.items ?? [];

  const activity =
    data?.activity?.items ?? [];

  const totalEvents =
    overview &&
    health
      ? health.totalEvents
      : 0;

  const successfulEvents =
    health?.successfulEvents ?? 0;

  const failedEvents =
    health?.failedEvents ?? 0;

  const successRate =
    health?.successRate ?? 0;

  const failureRate =
    health?.failureRate ?? 0;

  const revenueAtRisk =
    overview?.revenueAtRisk ?? 0;

  const recoverableRevenue =
    overview?.recoverableRevenue ?? 0;

  const recoveredRevenue =
    overview?.recoveredRevenue ?? 0;

  const recoveredCases =
    overview?.recoveredCases ?? 0;

  const activeRecoveryCases =
    overview?.activeRecoveryCases ?? 0;

  const recoveryRate =
    overview?.recoveryRate ?? 0;

  const activeIncidents =
    overview?.activeIncidents ?? 0;

  const actionableCases =
    data?.recoveryQueue
      ?.actionable ?? 0;

  /* =======================================================
     FAILURE BREAKDOWN
     ======================================================= */

  const failureBreakdown =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            label: string;
            count: number;
            amount: number;
          }
        >();

      recoveryQueue.forEach(
        (transaction) => {
          const label =
            transaction.failureReason ||
            "Unknown failure";

          const existing =
            map.get(label);

          if (existing) {
            existing.count += 1;
            existing.amount +=
              transaction.amount;
          } else {
            map.set(label, {
              label,
              count: 1,
              amount:
                transaction.amount,
            });
          }
        }
      );

      const total =
        recoveryQueue.length;

      return Array.from(
        map.values()
      )
        .map((item) => ({
          ...item,
          percentage:
            total > 0
              ? (item.count / total) *
                100
              : 0,
        }))
        .sort(
          (a, b) =>
            b.count - a.count
        );
    }, [recoveryQueue]);

  /* =======================================================
     PRIORITY BREAKDOWN
     ======================================================= */

  const priorityCounts =
    useMemo(() => {
      return {
        HIGH: recoveryQueue.filter(
          (item) =>
            item.priority === "HIGH"
        ).length,

        MEDIUM: recoveryQueue.filter(
          (item) =>
            item.priority === "MEDIUM"
        ).length,

        LOW: recoveryQueue.filter(
          (item) =>
            item.priority === "LOW"
        ).length,
      };
    }, [recoveryQueue]);

  /* =======================================================
     ACTION BREAKDOWN
     ======================================================= */

  const actionCounts =
    useMemo(() => {
      return {
        RETRY: recoveryQueue.filter(
          (item) =>
            item.recommendation ===
            "RETRY"
        ).length,

        PAYMENT_LINK:
          recoveryQueue.filter(
            (item) =>
              item.recommendation ===
              "PAYMENT_LINK"
          ).length,

        WAIT: recoveryQueue.filter(
          (item) =>
            item.recommendation ===
            "WAIT"
        ).length,

        REVIEW: recoveryQueue.filter(
          (item) =>
            item.recommendation ===
            "REVIEW"
        ).length,
      };
    }, [recoveryQueue]);

  /* =======================================================
     FORMATTERS
     ======================================================= */

  function formatINR(
    amount: number
  ) {
    return `₹${Number(
      amount || 0
    ).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(
    value?: string
  ) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function formatPercent(
    value: number
  ) {
    return `${Number(
      value || 0
    ).toFixed(1)}%`;
  }

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading && !data) {
    return (
      <main className="min-h-screen bg-[#f7f7f4] px-5 py-8 text-black md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">

          <div className="h-4 w-28 animate-pulse rounded bg-black/10" />

          <div className="mt-4 h-16 w-80 animate-pulse rounded-xl bg-black/10" />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <LargeLoadingCard />
            <LargeLoadingCard />
          </div>

        </div>
      </main>
    );
  }

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <main className="min-h-screen bg-[#f7f7f4] px-5 py-8 text-black md:px-8 lg:px-12">

      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
              RECOVR
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">
              Analytics
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-semibold text-black/55">
              Recovery performance, revenue exposure,
              incident intelligence, and autonomous
              recovery activity.
            </p>

          </div>

          <div className="flex items-center gap-3">

            {lastUpdated && (
              <span className="hidden text-xs font-bold text-black/40 md:block">
                Updated{" "}
                {lastUpdated.toLocaleTimeString(
                  "en-IN",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </span>
            )}

            <button
              onClick={() => {
                void loadAnalytics();
              }}
              disabled={loading}
              className="rounded-full border border-black bg-white px-5 py-2 text-xs font-black uppercase tracking-wider transition hover:bg-black hover:text-white disabled:opacity-50"
            >
              {loading
                ? "REFRESHING..."
                : "REFRESH"}
            </button>

            <div
              className={`rounded-full border border-black px-5 py-2 text-xs font-black uppercase tracking-wider ${
                health?.status ===
                "DEGRADED"
                  ? "bg-[#ffe5e5]"
                  : "bg-white"
              }`}
            >
              {health?.status ===
              "DEGRADED"
                ? "SYSTEM DEGRADED"
                : "SYSTEM HEALTHY"}
            </div>

          </div>

        </header>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            <div>{error}</div>

            <p className="mt-1 text-xs font-semibold text-red-600/80">
              Analytics is reading from
              /api/command-center.
            </p>
          </div>
        )}

        {/* =================================================
            EVENT METRICS
        ================================================= */}

        <section className="mt-10 grid gap-4 md:grid-cols-3">

          <MetricCard
            label="TOTAL EVENTS"
            value={totalEvents.toLocaleString(
              "en-IN"
            )}
          />

          <MetricCard
            label="FAILED EVENTS"
            value={failedEvents.toLocaleString(
              "en-IN"
            )}
          />

          <MetricCard
            label="SUCCESSFUL EVENTS"
            value={successfulEvents.toLocaleString(
              "en-IN"
            )}
          />

        </section>

        {/* =================================================
            REVENUE METRICS
        ================================================= */}

        <section className="mt-4 grid gap-4 md:grid-cols-3">

          <MetricCard
            label="REVENUE AT RISK"
            value={formatINR(
              revenueAtRisk
            )}
          />

          <MetricCard
            label="RECOVERABLE REVENUE"
            value={formatINR(
              recoverableRevenue
            )}
          />

          <MetricCard
            label="RECOVERED REVENUE"
            value={formatINR(
              recoveredRevenue
            )}
          />

        </section>

        {/* =================================================
            PERFORMANCE
        ================================================= */}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

          {/* SUCCESS RATE */}

          <div className="rounded-3xl border border-black bg-white p-6 md:p-8">

            <p className="text-xs font-black uppercase tracking-widest text-black/40">
              PAYMENT PERFORMANCE
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Success rate
            </h2>

            <div className="mt-8 flex items-end gap-3">

              <span className="text-6xl font-black tracking-tight">
                {formatPercent(
                  successRate
                )}
              </span>

              <span className="mb-2 text-sm font-bold text-black/40">
                successful events
              </span>

            </div>

            <div className="mt-6 h-4 overflow-hidden rounded-full border border-black bg-[#f7f7f4]">

              <div
                className="h-full bg-[#5f5cff] transition-all duration-700"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      successRate
                    )
                  )}%`,
                }}
              />

            </div>

            <div className="mt-5 flex justify-between text-xs font-bold">

              <span>
                {successfulEvents.toLocaleString(
                  "en-IN"
                )}{" "}
                successful
              </span>

              <span>
                {failedEvents.toLocaleString(
                  "en-IN"
                )}{" "}
                failed
              </span>

            </div>

          </div>

          {/* RECOVERY PERFORMANCE */}

          <div className="rounded-3xl border border-black bg-[#e9e7ff] p-6 md:p-8">

            <p className="text-xs font-black uppercase tracking-widest text-black/45">
              RECOVERY PERFORMANCE
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Recovery rate
            </h2>

            <p className="mt-8 text-6xl font-black tracking-tight">
              {formatPercent(
                recoveryRate
              )}
            </p>

            <p className="mt-2 text-sm font-bold text-black/45">
              recovered revenue against
              recoverable revenue
            </p>

            <div className="mt-7 border-t border-black/15 pt-6">

              <div className="flex justify-between">

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-black/40">
                    RECOVERED
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {formatINR(
                      recoveredRevenue
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-black uppercase tracking-widest text-black/40">
                    CASES
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {recoveredCases}
                  </p>
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            SYSTEM HEALTH
        ================================================= */}

        <section className="mt-6 rounded-3xl border border-black bg-white p-6 md:p-8">

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-black/40">
                SYSTEM HEALTH
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Payment system status
              </h2>

            </div>

            <div
              className={`rounded-full border border-black px-4 py-2 text-xs font-black ${
                health?.status ===
                "DEGRADED"
                  ? "bg-[#ffe5e5]"
                  : "bg-[#e9e7ff]"
              }`}
            >
              {health?.status ??
                "UNKNOWN"}
            </div>

          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">

            <HealthStat
              label="SUCCESS RATE"
              value={formatPercent(
                successRate
              )}
            />

            <HealthStat
              label="FAILURE RATE"
              value={formatPercent(
                failureRate
              )}
            />

            <HealthStat
              label="ACTIVE INCIDENTS"
              value={activeIncidents}
            />

            <HealthStat
              label="ANOMALY"
              value={
                health?.anomalyDetected
                  ? "DETECTED"
                  : "NONE"
              }
            />

          </div>

          {health?.reason && (
            <div className="mt-6 rounded-2xl border border-black/10 bg-[#f7f7f4] p-5">

              <p className="text-xs font-black uppercase tracking-widest text-black/40">
                SYSTEM ANALYSIS
              </p>

              <p className="mt-2 text-sm font-bold text-black/65">
                {health.reason}
              </p>

            </div>
          )}

        </section>

        {/* =================================================
            FAILURE INTELLIGENCE
        ================================================= */}

        <section className="mt-6 rounded-3xl border border-black bg-white p-6 md:p-8">

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-black/40">
                FAILURE INTELLIGENCE
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Failure signals
              </h2>

            </div>

            <div className="rounded-full border border-black px-4 py-2 text-xs font-black">
              {failureBreakdown.length}{" "}
              SIGNALS
            </div>

          </div>

          {failureBreakdown.length >
          0 ? (
            <div className="mt-8 space-y-4">

              {failureBreakdown.map(
                (failure) => (
                  <div
                    key={
                      failure.label
                    }
                    className="rounded-2xl border border-black bg-[#f7f7f4] p-5"
                  >

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                      <div>

                        <p className="text-lg font-black">
                          {failure.label}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-black/45">
                          {failure.count}{" "}
                          failed event
                          {failure.count !==
                          1
                            ? "s"
                            : ""}{" "}
                          ·{" "}
                          {failure.percentage.toFixed(
                            1
                          )}
                          % of recovery
                          queue
                        </p>

                      </div>

                      <p className="text-2xl font-black">
                        {formatINR(
                          failure.amount
                        )}
                      </p>

                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full border border-black bg-white">

                      <div
                        className="h-full bg-[#5f5cff]"
                        style={{
                          width: `${Math.min(
                            100,
                            failure.percentage
                          )}%`,
                        }}
                      />

                    </div>

                  </div>
                )
              )}

            </div>
          ) : (
            <EmptyState text="No failure signals recorded." />
          )}

        </section>

        {/* =================================================
            PRIORITY + ACTIONS
        ================================================= */}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* PRIORITY */}

          <div className="rounded-3xl border border-black bg-white p-6 md:p-8">

            <p className="text-xs font-black uppercase tracking-widest text-black/40">
              RECOVERY PRIORITY
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Queue distribution
            </h2>

            <div className="mt-8 space-y-4">

              <PriorityRow
                label="HIGH"
                count={
                  priorityCounts.HIGH
                }
                total={
                  recoveryQueue.length
                }
              />

              <PriorityRow
                label="MEDIUM"
                count={
                  priorityCounts.MEDIUM
                }
                total={
                  recoveryQueue.length
                }
              />

              <PriorityRow
                label="LOW"
                count={
                  priorityCounts.LOW
                }
                total={
                  recoveryQueue.length
                }
              />

            </div>

          </div>

          {/* ACTIONS */}

          <div className="rounded-3xl border border-black bg-white p-6 md:p-8">

            <p className="text-xs font-black uppercase tracking-widest text-black/40">
              AI RECOVERY ACTIONS
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Recommended strategies
            </h2>

            <div className="mt-8 grid grid-cols-2 gap-3">

              <ActionStat
                label="RETRY"
                value={
                  actionCounts.RETRY
                }
              />

              <ActionStat
                label="PAYMENT LINK"
                value={
                  actionCounts.PAYMENT_LINK
                }
              />

              <ActionStat
                label="WAIT"
                value={
                  actionCounts.WAIT
                }
              />

              <ActionStat
                label="REVIEW"
                value={
                  actionCounts.REVIEW
                }
              />

            </div>

          </div>

        </section>

        {/* =================================================
            RECOVERY QUEUE
        ================================================= */}

        <section className="mt-6 rounded-3xl border border-black bg-white p-6 md:p-8">

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-black/40">
                RECOVERY QUEUE
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Active recovery cases
              </h2>

            </div>

            <div className="flex gap-2">

              <div className="rounded-full border border-black px-4 py-2 text-xs font-black">
                {activeRecoveryCases}{" "}
                ACTIVE
              </div>

              <div className="rounded-full border border-black bg-[#e9e7ff] px-4 py-2 text-xs font-black">
                {actionableCases}{" "}
                ACTIONABLE
              </div>

            </div>

          </div>

          {recoveryQueue.length >
          0 ? (
            <div className="mt-8 overflow-x-auto">

              <table className="w-full min-w-[900px] border-collapse">

                <thead>

                  <tr className="border-b border-black/20 text-left text-xs font-black uppercase tracking-wider text-black/40">

                    <th className="pb-3">
                      PAYMENT
                    </th>

                    <th className="pb-3">
                      AMOUNT
                    </th>

                    <th className="pb-3">
                      FAILURE
                    </th>

                    <th className="pb-3">
                      PRIORITY
                    </th>

                    <th className="pb-3">
                      ACTION
                    </th>

                    <th className="pb-3">
                      CONFIDENCE
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {recoveryQueue
                    .slice(0, 20)
                    .map(
                      (item) => (
                        <tr
                          key={
                            item.id
                          }
                          className="border-b border-black/10 text-sm"
                        >

                          <td className="py-4">

                            <p className="font-black">
                              {
                                item.paymentId
                              }
                            </p>

                            <p className="mt-1 text-xs font-semibold text-black/40">
                              {
                                item.customerEmail
                              }
                            </p>

                          </td>

                          <td className="py-4 font-black">
                            {formatINR(
                              item.amount
                            )}
                          </td>

                          <td className="py-4 font-bold text-black/65">
                            {item.failureReason ||
                              "Unknown"}
                          </td>

                          <td className="py-4">

                            <PriorityBadge
                              priority={
                                item.priority
                              }
                            />

                          </td>

                          <td className="py-4">

                            <span className="rounded-full border border-black bg-white px-3 py-1 text-xs font-black">
                              {
                                item.recommendation
                              }
                            </span>

                          </td>

                          <td className="py-4 font-black">
                            {formatPercent(
                              Number(
                                item.confidence
                              ) > 1
                                ? Number(
                                    item.confidence
                                  )
                                : Number(
                                    item.confidence
                                  ) *
                                    100
                            )}
                          </td>

                        </tr>
                      )
                    )}

                </tbody>

              </table>

            </div>
          ) : (
            <EmptyState text="No active recovery cases." />
          )}

        </section>

        {/* =================================================
            INCIDENTS
        ================================================= */}

        <section className="mt-6 rounded-3xl border border-black bg-white p-6 md:p-8">

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-black/40">
                INCIDENT INTELLIGENCE
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Provider incidents
              </h2>

            </div>

            <div className="rounded-full border border-black px-4 py-2 text-xs font-black">
              {activeIncidents}{" "}
              ACTIVE
            </div>

          </div>

          {incidents.length >
          0 ? (
            <div className="mt-8 space-y-4">

              {incidents
                .slice(0, 10)
                .map(
                  (incident) => (
                    <div
                      key={
                        incident.id
                      }
                      className="rounded-2xl border border-black bg-[#f7f7f4] p-5"
                    >

                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="font-black">
                              {incident.type ||
                                "INCIDENT"}
                            </span>

                            <span className="rounded-full border border-black bg-white px-3 py-1 text-[10px] font-black">
                              {incident.severity ||
                                "UNKNOWN"}
                            </span>

                            <span className="rounded-full border border-black bg-white px-3 py-1 text-[10px] font-black">
                              {incident.status ||
                                "UNKNOWN"}
                            </span>

                          </div>

                          <p className="mt-2 text-sm font-bold text-black/50">
                            Detected{" "}
                            {formatDate(
                              incident.detectedAt
                            )}
                          </p>

                        </div>

                        <div className="text-right">

                          <p className="text-xs font-black uppercase tracking-wider text-black/40">
                            CONFIDENCE
                          </p>

                          <p className="mt-1 text-xl font-black">
                            {formatPercent(
                              Number(
                                incident.confidence ??
                                  0
                              ) > 1
                                ? Number(
                                    incident.confidence ??
                                      0
                                  )
                                : Number(
                                    incident.confidence ??
                                      0
                                  ) *
                                    100
                            )}
                          </p>

                        </div>

                      </div>

                      {(incident.description ||
                        incident.message) && (
                        <p className="mt-4 text-sm font-semibold text-black/60">
                          {incident.description ||
                            incident.message}
                        </p>
                      )}

                    </div>
                  )
                )}

            </div>
          ) : (
            <EmptyState text="No incidents recorded." />
          )}

        </section>

        {/* =================================================
            ACTIVITY
        ================================================= */}

        <section className="mt-6 rounded-3xl border border-black bg-white p-6 md:p-8">

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-black/40">
                AUDIT ACTIVITY
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Recovery timeline
              </h2>

            </div>

            <div className="rounded-full border border-black px-4 py-2 text-xs font-black">
              {activity.length}{" "}
              EVENTS
            </div>

          </div>

          {activity.length >
          0 ? (
            <div className="mt-8 space-y-3">

              {activity
                .slice(0, 20)
                .map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="grid gap-4 rounded-2xl border border-black/10 bg-[#f7f7f4] p-4 md:grid-cols-[150px_1fr_auto] md:items-center"
                    >

                      <div>

                        <p className="text-xs font-black uppercase tracking-wider text-black/40">
                          {item.type}
                        </p>

                        <p className="mt-1 text-xs font-bold text-black/45">
                          {formatDate(
                            item.createdAt
                          )}
                        </p>

                      </div>

                      <div>

                        <p className="text-sm font-black">
                          {item.message}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-black/40">
                          {
                            item.paymentId
                          }{" "}
                          ·{" "}
                          {
                            item.customerEmail
                          }
                        </p>

                      </div>

                      <p className="text-right text-lg font-black">
                        {formatINR(
                          item.amount
                        )}
                      </p>

                    </div>
                  )
                )}

            </div>
          ) : (
            <EmptyState text="No recovery activity recorded." />
          )}

        </section>

        {/* =================================================
            BOTTOM METRICS
        ================================================= */}

        <section className="mt-6 grid gap-4 md:grid-cols-3">

          <MetricCard
            label="FAILURE RATE"
            value={formatPercent(
              failureRate
            )}
          />

          <MetricCard
            label="ACTIVE RECOVERY CASES"
            value={activeRecoveryCases.toLocaleString(
              "en-IN"
            )}
          />

          <MetricCard
            label="TOTAL INCIDENTS"
            value={(
              overview?.totalIncidents ??
              0
            ).toLocaleString(
              "en-IN"
            )}
          />

        </section>

        <div className="h-16" />

      </div>

    </main>
  );
}

/* =========================================================
   COMPONENTS
   ========================================================= */

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-black bg-white p-6">

      <p className="text-xs font-black uppercase tracking-widest text-black/40">
        {label}
      </p>

      <p className="mt-4 break-words text-3xl font-black tracking-tight md:text-4xl">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   HEALTH STAT
   ========================================================= */

function HealthStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#f7f7f4] p-5">

      <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   PRIORITY
   ========================================================= */

function PriorityRow({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const percentage =
    total > 0
      ? (count / total) * 100
      : 0;

  return (
    <div>

      <div className="flex justify-between text-sm font-black">

        <span>{label}</span>

        <span>
          {count} ·{" "}
          {percentage.toFixed(1)}%
        </span>

      </div>

      <div className="mt-2 h-3 overflow-hidden rounded-full border border-black bg-[#f7f7f4]">

        <div
          className="h-full bg-[#5f5cff]"
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}

/* =========================================================
   ACTION STAT
   ========================================================= */

function ActionStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-black bg-[#f7f7f4] p-5">

      <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   PRIORITY BADGE
   ========================================================= */

function PriorityBadge({
  priority,
}: {
  priority: string;
}) {
  return (
    <span
      className={`rounded-full border border-black px-3 py-1 text-xs font-black ${
        priority === "HIGH"
          ? "bg-[#ffe5e5]"
          : priority ===
            "MEDIUM"
          ? "bg-[#fff4d6]"
          : "bg-white"
      }`}
    >
      {priority}
    </span>
  );
}

/* =========================================================
   EMPTY
   ========================================================= */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-black/30 p-8 text-center">

      <p className="text-sm font-bold text-black/45">
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   LOADING
   ========================================================= */

function LoadingCard() {
  return (
    <div className="h-36 animate-pulse rounded-3xl border border-black bg-white" />
  );
}

function LargeLoadingCard() {
  return (
    <div className="h-72 animate-pulse rounded-3xl border border-black bg-white" />
  );
}