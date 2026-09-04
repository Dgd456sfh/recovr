"use client";

import { useEffect, useState } from "react";

type RecoveryCase = {
  id: string;
  paymentId: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: string;
  failureReason: string | null;
  recoverable: boolean;
  recoveryStatus: string;
  recommendation: string;
  confidence: number;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

type RecoveryResponse = {
  success: boolean;
  summary: {
    totalTransactions: number;
    recoverableCases: number;
    revenueAtRisk: number;
    currency: string;
  };
  cases: RecoveryCase[];
};

export default function AnalyticsPage() {
  const [data, setData] =
    useState<RecoveryResponse | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);

      const response = await fetch("/api/recovery", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load analytics");
      }

      const result =
        (await response.json()) as RecoveryResponse;

      setData(result);
    } catch (error) {
      console.error("Analytics error:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const cases = data?.cases ?? [];

  const totalTransactions =
    data?.summary.totalTransactions ?? 0;

  const revenueAtRisk =
    data?.summary.revenueAtRisk ?? 0;

  const successfulPayments = cases.filter(
    (item) => item.status === "SUCCESS"
  ).length;

  const failedPayments = cases.filter(
    (item) => item.status === "FAILED"
  ).length;

  const recoveryOpportunities = cases.filter(
    (item) => item.recoverable
  ).length;

  const paymentLinks = cases.filter(
    (item) =>
      item.recoveryStatus ===
      "PAYMENT_LINK_GENERATED"
  ).length;

  const retries = cases.filter(
    (item) =>
      item.recoveryStatus ===
      "RETRY_SCHEDULED"
  ).length;

  const executedActions =
    paymentLinks + retries;

  const recoveryRate =
    totalTransactions > 0
      ? Math.round(
          (recoveryOpportunities /
            totalTransactions) *
            1000
        ) / 10
      : 0;

  const failureReasons = getFailureReasons(cases);

  const recoveryStatuses = getRecoveryStatuses(cases);

  function formatINR(amount: number) {
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-[#111]">
      {/* HEADER */}

      <header className="border-b border-black/10 bg-[#f5f5f0]">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 md:px-8">
          <a
            href="/"
            className="text-xl font-black tracking-[-0.08em]"
          >
            RECO
            <span className="text-[#5f5cff]">
              VR
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-[11px] font-semibold md:flex">
            <a
              href="/dashboard"
              className="text-black/50 hover:text-black"
            >
              Overview
            </a>

            <a
              href="/dashboard"
              className="text-black/50 hover:text-black"
            >
              Recovery
            </a>

            <span className="text-black">
              Analytics
            </span>

            <a
              href="/audit"
              className="text-black/50 hover:text-black"
            >
              Audit Log
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-[10px] font-bold">
                Demo Merchant
              </div>

              <div className="text-[9px] text-black/50">
                Razorpay Test Mode
              </div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111] text-[10px] font-bold text-white">
              DM
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8 md:py-10">
        {/* TITLE */}

        <div>
          <div className="text-[9px] font-bold tracking-[0.2em] text-[#5f5cff]">
            RECOVERY INTELLIGENCE
          </div>

          <h1 className="mt-3 text-[42px] font-black tracking-[-0.06em] md:text-[58px]">
            Analytics
          </h1>

          <p className="mt-2 text-[12px] text-black/50">
            Understand payment failures, recovery
            opportunities and recovery performance.
          </p>
        </div>

        {/* TOP METRICS */}

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Transaction Volume"
            value={
              loading
                ? "—"
                : String(totalTransactions)
            }
          />

          <Metric
            label="Successful Payments"
            value={
              loading
                ? "—"
                : String(successfulPayments)
            }
          />

          <Metric
            label="Failed Payments"
            value={
              loading
                ? "—"
                : String(failedPayments)
            }
          />

          <Metric
            label="Revenue At Risk"
            value={
              loading
                ? "—"
                : formatINR(revenueAtRisk)
            }
          />
        </div>

        {/* SECOND METRICS */}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Recovery Opportunities"
            value={
              loading
                ? "—"
                : String(recoveryOpportunities)
            }
          />

          <Metric
            label="Recovery Rate"
            value={
              loading
                ? "—"
                : `${recoveryRate}%`
            }
          />

          <Metric
            label="Payment Links"
            value={
              loading
                ? "—"
                : String(paymentLinks)
            }
          />

          <Metric
            label="Retries Scheduled"
            value={
              loading
                ? "—"
                : String(retries)
            }
          />
        </div>

        {/* MAIN ANALYTICS */}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* PAYMENT PERFORMANCE */}

          <section className="rounded-[24px] border border-black/10 bg-white p-6 md:p-7">
            <div>
              <div className="text-[9px] font-bold tracking-[0.18em] text-black/40">
                PAYMENT PERFORMANCE
              </div>

              <div className="mt-2 text-[22px] font-black">
                Transaction health
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <ProgressRow
                label="Successful payments"
                value={successfulPayments}
                total={totalTransactions}
              />

              <ProgressRow
                label="Failed payments"
                value={failedPayments}
                total={totalTransactions}
              />

              <ProgressRow
                label="Recoverable payments"
                value={recoveryOpportunities}
                total={totalTransactions}
              />
            </div>
          </section>

          {/* RECOVERY PERFORMANCE */}

          <section className="rounded-[24px] bg-[#111] p-6 text-white md:p-7">
            <div className="text-[9px] font-bold tracking-[0.18em] text-white/35">
              RECOVERY PERFORMANCE
            </div>

            <div className="mt-2 text-[22px] font-black">
              Recovery actions
            </div>

            <div className="mt-8 space-y-6">
              <DarkProgressRow
                label="Payment links generated"
                value={paymentLinks}
                total={recoveryOpportunities}
              />

              <DarkProgressRow
                label="Retries scheduled"
                value={retries}
                total={recoveryOpportunities}
              />

              <div className="rounded-2xl bg-white/5 p-5">
                <div className="text-[9px] text-white/40">
                  ACTIONS EXECUTED
                </div>

                <div className="mt-2 text-[34px] font-black">
                  {executedActions}
                </div>

                <div className="mt-1 text-[9px] text-white/40">
                  Recovery actions recorded in the
                  system
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* BREAKDOWNS */}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* FAILURE BREAKDOWN */}

          <section className="rounded-[24px] border border-black/10 bg-white p-6 md:p-7">
            <div className="text-[9px] font-bold tracking-[0.18em] text-black/40">
              FAILURE ANALYSIS
            </div>

            <div className="mt-2 text-[22px] font-black">
              Why payments fail
            </div>

            <div className="mt-8 space-y-5">
              {failureReasons.length === 0 ? (
                <div className="rounded-xl bg-[#f5f5f0] p-5 text-[10px] text-black/40">
                  No payment failures detected.
                </div>
              ) : (
                failureReasons.map((item) => (
                  <ProgressRow
                    key={item.label}
                    label={item.label}
                    value={item.amount}
                    total={failedPayments}
                    amountMode
                  />
                ))
              )}
            </div>
          </section>

          {/* RECOVERY STATUS */}

          <section className="rounded-[24px] border border-black/10 bg-white p-6 md:p-7">
            <div className="text-[9px] font-bold tracking-[0.18em] text-black/40">
              RECOVERY STATUS
            </div>

            <div className="mt-2 text-[22px] font-black">
              Current case states
            </div>

            <div className="mt-8 space-y-4">
              {recoveryStatuses.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl bg-[#f5f5f0] p-4"
                >
                  <div>
                    <div className="text-[10px] font-bold">
                      {item.label}
                    </div>

                    <div className="mt-1 text-[9px] text-black/40">
                      Recovery cases
                    </div>
                  </div>

                  <div className="text-[22px] font-black">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* INSIGHT */}

        <section className="mt-6 rounded-[24px] border border-[#5f5cff]/15 bg-[#5f5cff]/5 p-6 md:p-7">
          <div className="text-[9px] font-bold tracking-[0.18em] text-[#5f5cff]">
            RECOVERY INSIGHT
          </div>

          <div className="mt-3 text-[20px] font-black">
            {failedPayments > 0
              ? `${failedPayments} failed payments require recovery evaluation.`
              : "No active payment failures detected."}
          </div>

          <p className="mt-2 max-w-3xl text-[10px] leading-5 text-black/55">
            RECOVR evaluates failed transactions,
            identifies recoverable opportunities and
            recommends bounded recovery actions based
            on the failure pattern.
          </p>
        </section>

        {/* FOOTER */}

        <div className="mt-12 flex flex-col gap-2 border-t border-black/10 pt-6 text-[9px] text-black/40 md:flex-row md:justify-between">
          <span>
            RECOVR · Revenue Recovery Control Tower
          </span>

          <span>
            Razorpay Test Mode · Demo Environment
          </span>
        </div>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-black/10 bg-white p-5">
      <div className="text-[9px] font-bold tracking-[0.15em] text-black/40">
        {label}
      </div>

      <div className="mt-5 text-[30px] font-black tracking-[-0.05em]">
        {value}
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  amountMode = false,
}: {
  label: string;
  value: number;
  total: number;
  amountMode?: boolean;
}) {
  const percentage =
    total > 0
      ? Math.round((value / total) * 100)
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold">
          {label}
        </span>

        <span className="text-[10px] font-black">
          {amountMode
            ? `${value} cases`
            : `${value} (${percentage}%)`}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/5">
        <div
          className="h-full rounded-full bg-[#5f5cff]"
          style={{
            width: `${Math.max(
              percentage,
              value > 0 ? 5 : 0
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function DarkProgressRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage =
    total > 0
      ? Math.round((value / total) * 100)
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/50">
          {label}
        </span>

        <span className="text-[10px] font-bold">
          {value}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#9693ff]"
          style={{
            width: `${Math.max(
              percentage,
              value > 0 ? 5 : 0
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function getFailureReasons(
  cases: RecoveryCase[]
) {
  const failed = cases.filter(
    (item) => item.status === "FAILED"
  );

  const map: Record<string, number> = {};

  failed.forEach((item) => {
    const reason =
      item.failureReason || "Other";

    map[reason] = (map[reason] || 0) + 1;
  });

  return Object.entries(map)
    .map(([label, amount]) => ({
      label,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function getRecoveryStatuses(
  cases: RecoveryCase[]
) {
  const map: Record<string, number> = {};

  cases.forEach((item) => {
    const status =
      item.recoveryStatus || "PENDING";

    map[status] = (map[status] || 0) + 1;
  });

  return Object.entries(map)
    .map(([label, value]) => ({
      label: formatStatus(label),
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function formatStatus(status: string) {
  switch (status) {
    case "PAYMENT_LINK_GENERATED":
      return "Payment Link Generated";

    case "RETRY_SCHEDULED":
      return "Retry Scheduled";

    case "NOT_REQUIRED":
      return "No Action";

    case "PENDING":
      return "Pending";

    default:
      return status.replaceAll("_", " ");
  }
}