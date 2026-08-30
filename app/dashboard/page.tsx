"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

type Recommendation =
  | "RETRY"
  | "PAYMENT_LINK"
  | "REVIEW"
  | "NO_ACTION";

type RecoveryCase = {
  id: string;
  paymentId: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: string;
  failureReason: string | null;
  recoverable: boolean;
  recovered: boolean;
  recoveredAmount: number | null;
  recoveredAt: string | null;
  recoveryStatus: string;
  recoveryAction: string | null;
  recommendation: Recommendation;
  confidence: number;
  reason: string;
  priority: string;
  shouldRecover: boolean;
  createdAt: string;
  updatedAt: string;
};

type RecoveryResponse = {
  success: boolean;
  summary: {
    totalTransactions: number;
    activeRecoveryCases: number;
    reviewRequired: number;
    recoveredCases: number;
    revenueAtRisk: number;
    recoveredAmount: number;
    recoveryRate: number;
    currency: string;
  };
  cases: RecoveryCase[];
};

type ActionType =
  | "RETRY"
  | "PAYMENT_LINK"
  | "MARK_RECOVERED";

export default function Dashboard() {
  const [data, setData] =
    useState<RecoveryResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [analysisRunning, setAnalysisRunning] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [actionMessage, setActionMessage] =
    useState<string | null>(null);

  useEffect(() => {
    void loadRecoveryData();
  }, []);

  async function loadRecoveryData() {
    try {
      setLoading(true);

      const response = await fetch("/api/recovery", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to fetch recovery data"
        );
      }

      setData(result);
    } catch (error) {
      console.error(
        "Dashboard data error:",
        error
      );

      setActionMessage(
        "Failed to load recovery data."
      );
    } finally {
      setLoading(false);
    }
  }

  async function runRecoveryAnalysis() {
    try {
      setAnalysisRunning(true);
      setActionMessage(null);

      await fetch("/api/orchestrate", {
        method: "POST",
      });

      await loadRecoveryData();

      setActionMessage(
        "Recovery analysis completed successfully."
      );
    } catch (error) {
      console.error(
        "Recovery analysis error:",
        error
      );

      setActionMessage(
        "Failed to run recovery analysis."
      );
    } finally {
      setAnalysisRunning(false);
    }
  }

  async function executeRecovery(
    transactionId: string,
    action: ActionType
  ) {
    try {
      setActionLoading(transactionId);
      setActionMessage(null);

      const response = await fetch(
        "/api/recovery",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            transactionId,
            action,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Recovery action failed"
        );
      }

      setActionMessage(
        action === "RETRY"
          ? "Payment retry scheduled successfully."
          : action === "PAYMENT_LINK"
          ? "Payment link generated successfully."
          : "Payment recovered successfully."
      );

      await loadRecoveryData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Recovery action failed";

      console.error(
        "Recovery action error:",
        error
      );

      setActionMessage(message);
    } finally {
      setActionLoading(null);
    }
  }

  const filteredCases = useMemo(() => {
    if (!data?.cases) {
      return [];
    }

    const query =
      search.toLowerCase().trim();

    if (!query) {
      return data.cases;
    }

    return data.cases.filter((item) => {
      return (
        item.paymentId
          .toLowerCase()
          .includes(query) ||
        item.customerEmail
          .toLowerCase()
          .includes(query) ||
        (item.failureReason ?? "")
          .toLowerCase()
          .includes(query) ||
        item.recommendation
          .toLowerCase()
          .includes(query)
      );
    });
  }, [data, search]);

  const revenueAtRisk =
    data?.summary.revenueAtRisk ?? 0;

  const activeRecoveryCases =
    data?.summary.activeRecoveryCases ?? 0;

  const recoveredCases =
    data?.summary.recoveredCases ?? 0;

  const totalTransactions =
    data?.summary.totalTransactions ?? 0;

  const recoveryRate =
    data?.summary.recoveryRate ?? 0;

  const recoveredAmount =
    data?.summary.recoveredAmount ?? 0;

  const failedCases =
    data?.cases.filter(
      (item) => item.status === "FAILED"
    ) ?? [];

  const failureBreakdown =
    getFailureBreakdown(failedCases);

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-[#111]">
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
            <a href="/command-center">
              Command Center
            </a>

            <a href="/cases">
              Recovery Cases
            </a>

            <a href="/analytics">
              Analytics
            </a>

            <a href="/audit">
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

      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="text-[9px] font-bold tracking-[0.2em] text-[#5f5cff]">
              RECOVERY COMMAND CENTER
            </div>

            <h1 className="mt-3 text-[42px] font-black tracking-[-0.06em] md:text-[58px]">
              Revenue Recovery
            </h1>

            <p className="mt-2 text-[12px] text-black/60">
              Monitor revenue at risk,
              recovery decisions and outcomes.
            </p>
          </div>

          <button
            type="button"
            onClick={runRecoveryAnalysis}
            disabled={analysisRunning}
            className="flex w-fit items-center gap-2 rounded-full bg-[#111] px-5 py-3 text-[11px] font-bold text-white transition hover:bg-[#5f5cff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles size={13} />

            {analysisRunning
              ? "Analyzing..."
              : "Run Recovery Analysis"}
          </button>
        </div>

        {actionMessage && (
          <div className="mt-5 rounded-xl border border-black/10 bg-white px-4 py-3 text-[10px] font-semibold">
            {actionMessage}
          </div>
        )}

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Revenue At Risk"
            value={
              loading
                ? "—"
                : formatINR(revenueAtRisk)
            }
            change={
              loading
                ? "Loading..."
                : `${activeRecoveryCases} active`
            }
            negative
            icon={CircleAlert}
          />

          <MetricCard
            label="Recovered"
            value={
              loading
                ? "—"
                : formatINR(recoveredAmount)
            }
            change={`${recoveredCases} recovered cases`}
            icon={TrendingUp}
          />

          <MetricCard
            label="Recovery Rate"
            value={
              loading
                ? "—"
                : `${recoveryRate}%`
            }
            change={`${activeRecoveryCases} active opportunities`}
            icon={ArrowUpRight}
          />

          <MetricCard
            label="Active Cases"
            value={
              loading
                ? "—"
                : String(activeRecoveryCases)
            }
            change={`${totalTransactions} transactions`}
            icon={Zap}
          />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <section className="rounded-[24px] border border-black/10 bg-white p-5 md:p-7">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[9px] font-bold tracking-[0.18em] text-black/50">
                  RECOVERY PERFORMANCE
                </div>

                <div className="mt-2 text-[22px] font-black tracking-[-0.04em]">
                  Revenue at risk
                </div>
              </div>

              <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px]">
                Live dataset
              </div>
            </div>

            <div className="relative mt-10 h-[250px] overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-between">
                {[
                  "₹20K",
                  "₹15K",
                  "₹10K",
                  "₹5K",
                  "₹0",
                ].map((value) => (
                  <div
                    key={value}
                    className="flex items-center gap-3 border-b border-dashed border-black/10"
                  >
                    <span className="w-8 text-[9px] text-black/50">
                      {value}
                    </span>

                    <div className="h-px flex-1" />
                  </div>
                ))}
              </div>

              <svg
                viewBox="0 0 900 250"
                className="absolute bottom-0 left-0 h-full w-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 210 C80 200 100 180 160 190 C220 200 240 150 300 165 C370 185 390 130 450 145 C520 165 550 105 610 120 C680 138 700 65 770 85 C820 98 850 45 900 55"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-[#5f5cff]"
                />

                <path
                  d="M0 210 C80 200 100 180 160 190 C220 200 240 150 300 165 C370 185 390 130 450 145 C520 165 550 105 610 120 C680 138 700 65 770 85 C820 98 850 45 900 55 L900 250 L0 250 Z"
                  className="fill-[#5f5cff]/5"
                />
              </svg>
            </div>
          </section>

          <section className="rounded-[24px] bg-[#111] p-6 text-white md:p-7">
            <div className="text-[9px] font-bold tracking-[0.18em] text-white/35">
              REVENUE AT RISK
            </div>

            <div className="mt-4 text-[42px] font-black tracking-[-0.06em]">
              {loading
                ? "—"
                : formatINR(revenueAtRisk)}
            </div>

            <div className="mt-2 flex items-center gap-2 text-[10px] text-[#ff9898]">
              <ArrowDownRight size={13} />
              Based on current failed transactions
            </div>

            <div className="mt-10 space-y-4">
              {failureBreakdown.length > 0 ? (
                failureBreakdown.map((item) => (
                  <RiskRow
                    key={item.label}
                    label={item.label}
                    amount={formatINR(item.amount)}
                    percentage={item.percentage}
                  />
                ))
              ) : (
                <div className="rounded-xl bg-white/5 p-4 text-[10px] text-white/50">
                  No failed transactions detected.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[24px] border border-black/10 bg-white">
          <div className="flex flex-col gap-4 border-b border-black/10 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="text-[9px] font-bold tracking-[0.18em] text-black/50">
                ACTIVE RECOVERY CASES
              </div>

              <div className="mt-1 text-lg font-black">
                Recovery Queue
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 md:w-[300px]">
              <Search
                size={13}
                className="text-black/50"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search cases..."
                className="w-full bg-transparent text-[10px] outline-none placeholder:text-black/40"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="hidden grid-cols-[1fr_1.2fr_1fr_0.7fr_1.2fr] gap-4 border-b border-black/10 px-6 py-3 text-[8px] font-bold tracking-wider text-black/50 md:grid">
            <span>CASE</span>
            <span>CUSTOMER</span>
            <span>AMOUNT</span>
            <span>RECOVERY</span>
            <span>ACTION</span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[11px] text-black/50">
              Loading recovery cases...
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-[12px] font-bold">
                No recovery cases found
              </div>

              <div className="mt-1 text-[10px] text-black/40">
                Try a different search.
              </div>
            </div>
          ) : (
            filteredCases.map((item) => (
              <RecoveryCaseRow
                key={item.id}
                item={item}
                actionLoading={actionLoading}
                onExecute={executeRecovery}
              />
            ))
          )}
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-[24px] border border-black/10 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold tracking-[0.18em] text-black/50">
                  RECOVERY INTELLIGENCE
                </div>

                <div className="mt-2 text-lg font-black">
                  Latest analysis
                </div>
              </div>

              <Sparkles
                size={18}
                className="text-[#5f5cff]"
              />
            </div>

            <div className="mt-7 rounded-2xl bg-[#f5f5f0] p-5">
              <div className="text-[9px] font-bold tracking-wider text-black/50">
                DETECTED PATTERN
              </div>

              <div className="mt-2 text-[15px] font-bold">
                {failedCases.length > 0
                  ? "Payment failures detected"
                  : "No active failure pattern"}
              </div>

              <p className="mt-2 text-[10px] leading-5 text-black/60">
                {failedCases.length > 0
                  ? `${failedCases.length} failed transaction${
                      failedCases.length > 1
                        ? "s"
                        : ""
                    } currently require recovery evaluation.`
                  : "The current transaction dataset does not contain failed payments requiring intervention."}
              </p>
            </div>

            <div className="mt-3 rounded-2xl border border-[#5f5cff]/15 bg-[#5f5cff]/5 p-5">
              <div className="text-[9px] font-bold tracking-wider text-[#5f5cff]">
                RECOMMENDATION
              </div>

              <div className="mt-2 text-[15px] font-black">
                Prioritize high-confidence recovery actions.
              </div>

              <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-black/60">
                <ShieldCheck size={13} />
                Policy constraints satisfied
              </div>
            </div>
          </section>

          <section className="rounded-[24px] bg-[#111] p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold tracking-[0.18em] text-white/35">
                  POLICY ENGINE
                </div>

                <div className="mt-2 text-lg font-black">
                  Bounded recovery
                </div>
              </div>

              <ShieldCheck
                size={18}
                className="text-[#72d89b]"
              />
            </div>

            <div className="mt-7 space-y-2">
              <PolicyRow
                label="Maximum attempts"
                value="3"
              />

              <PolicyRow
                label="Minimum confidence"
                value="75%"
              />

              <PolicyRow
                label="Maximum amount"
                value="₹50,000"
              />

              <PolicyRow
                label="Duplicate actions"
                value="BLOCKED"
              />
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#72d89b]/10 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#72d89b]">
                <Check size={13} />
                System healthy
              </div>

              <span className="text-[9px] text-white/30">
                0 policy violations
              </span>
            </div>
          </section>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-black/10 pt-6 text-[9px] text-black/50 md:flex-row md:justify-between">
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

function RecoveryCaseRow({
  item,
  actionLoading,
  onExecute,
}: {
  item: RecoveryCase;
  actionLoading: string | null;
  onExecute: (
    transactionId: string,
    action: ActionType
  ) => Promise<void>;
}) {
  const hasExecuted =
    item.recoveryStatus ===
      "RETRY_SCHEDULED" ||
    item.recoveryStatus ===
      "PAYMENT_LINK_GENERATED";

  const isRecovered =
    item.recoveryStatus === "RECOVERED" ||
    item.status === "RECOVERED";

  const isLoading =
    actionLoading === item.id;

  return (
    <div className="border-b border-black/10 p-5 md:px-6">
      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr_1fr_0.7fr_1.2fr] md:items-center">
        <div>
          <div className="text-[8px] font-bold text-black/40">
            PAYMENT
          </div>

          <div className="mt-1 text-[11px] font-bold">
            {item.paymentId}
          </div>
        </div>

        <div>
          <div className="text-[8px] font-bold text-black/40 md:hidden">
            CUSTOMER
          </div>

          <div className="mt-1 text-[11px] font-semibold">
            {item.customerEmail}
          </div>
        </div>

        <div>
          <div className="text-[8px] font-bold text-black/40 md:hidden">
            AMOUNT
          </div>

          <div className="mt-1 text-[16px] font-black">
            {formatINR(item.amount)}
          </div>
        </div>

        <div>
          <div className="text-[8px] font-bold text-black/40 md:hidden">
            RECOVERY
          </div>

          <div className="mt-1 text-[12px] font-bold text-[#5f5cff]">
            {item.recoverable
              ? `${item.confidence}%`
              : "—"}
          </div>
        </div>

        <div>
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-[8px] font-bold ${
              isRecovered
                ? "bg-[#eaf8ef] text-[#177245]"
                : item.recommendation ===
                  "NO_ACTION"
                ? "bg-black/5 text-black"
                : item.recommendation ===
                  "REVIEW"
                ? "bg-[#fff4df] text-[#9a6500]"
                : "bg-[#eaf8ef] text-[#177245]"
            }`}
          >
            {isRecovered
              ? "Recovered"
              : formatRecommendation(
                  item.recommendation
                )}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#f5f5f0] px-4 py-3 text-[9px] leading-4 text-black/60">
        <span className="font-bold text-black">
          Reason:
        </span>{" "}
        {item.reason}
      </div>

      {item.recoverable &&
        !isRecovered &&
        item.recommendation !==
          "NO_ACTION" &&
        item.recommendation !==
          "REVIEW" && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {hasExecuted ? (
              <>
                <div className="rounded-lg bg-[#eaf8ef] px-4 py-2 text-[9px] font-bold text-[#177245]">
                  {item.recoveryStatus ===
                  "RETRY_SCHEDULED"
                    ? "Retry scheduled"
                    : "Payment link generated"}
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    void onExecute(
                      item.id,
                      "MARK_RECOVERED"
                    )
                  }
                  className="rounded-lg bg-[#5f5cff] px-4 py-2 text-[9px] font-bold text-white transition hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading
                    ? "Processing..."
                    : "Mark as Recovered"}
                </button>
              </>
            ) : item.recommendation ===
              "RETRY" ? (
              <button
                type="button"
                disabled={isLoading}
                onClick={() =>
                  void onExecute(
                    item.id,
                    "RETRY"
                  )
                }
                className="rounded-lg bg-[#111] px-4 py-2 text-[9px] font-bold text-white transition hover:bg-[#5f5cff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading
                  ? "Processing..."
                  : "Schedule Retry"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={() =>
                  void onExecute(
                    item.id,
                    "PAYMENT_LINK"
                  )
                }
                className="rounded-lg bg-[#111] px-4 py-2 text-[9px] font-bold text-white transition hover:bg-[#5f5cff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading
                  ? "Processing..."
                  : "Generate Payment Link"}
              </button>
            )}
          </div>
        )}

      {isRecovered && (
        <div className="mt-4 inline-flex rounded-lg bg-[#eaf8ef] px-4 py-2 text-[9px] font-bold text-[#177245]">
          ✓ Payment recovered successfully
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  negative = false,
}: {
  label: string;
  value: string;
  change: string;
  icon: typeof CircleAlert;
  negative?: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-[0.15em] text-black/50">
          {label}
        </span>

        <Icon
          size={15}
          className="text-black/50"
        />
      </div>

      <div className="mt-5 text-[31px] font-black tracking-[-0.05em]">
        {value}
      </div>

      <div
        className={`mt-2 text-[9px] font-bold ${
          negative
            ? "text-[#d95d5d]"
            : "text-[#177245]"
        }`}
      >
        {change}
      </div>
    </div>
  );
}

function RiskRow({
  label,
  amount,
  percentage,
}: {
  label: string;
  amount: string;
  percentage: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/45">
          {label}
        </span>

        <span className="font-bold">
          {amount}
        </span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#9693ff]"
          style={{
            width: `${Math.max(
              0,
              Math.min(
                percentage,
                100
              )
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function PolicyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-4">
      <span className="text-[10px] text-white/40">
        {label}
      </span>

      <span className="text-[11px] font-bold">
        {value}
      </span>
    </div>
  );
}

function formatINR(amount: number) {
  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
}

function formatRecommendation(
  value: Recommendation
) {
  switch (value) {
    case "RETRY":
      return "Retry Recommended";

    case "PAYMENT_LINK":
      return "Payment Link";

    case "NO_ACTION":
      return "No Action";

    case "REVIEW":
      return "Review Required";

    default:
      return value;
  }
}

function getFailureBreakdown(
  cases: RecoveryCase[]
) {
  const map = new Map<string, number>();

  cases.forEach((item) => {
    const reason =
      item.failureReason || "Other";

    map.set(
      reason,
      (map.get(reason) || 0) +
        item.amount
    );
  });

  const total = cases.reduce(
    (sum, item) =>
      sum + item.amount,
    0
  );

  return Array.from(
    map.entries()
  )
    .map(([label, amount]) => ({
      label,
      amount,
      percentage:
        total > 0
          ? Math.round(
              (amount / total) * 100
            )
          : 0,
    }))
    .sort(
      (a, b) =>
        b.amount - a.amount
    );
}