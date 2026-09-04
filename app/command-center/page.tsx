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

/* =========================================================
   TYPES
========================================================= */

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

  recoveryStatus: string;
  recoveryAction: string | null;

  recommendation: Recommendation;
  confidence: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  shouldRecover: boolean;

  createdAt: string;
  updatedAt: string;
};

type RecoveredTransaction = {
  id: string;
  paymentId: string;
  customerEmail: string;
  amount: number;
  currency: string;

  status: string;
  recovered: boolean;
  recoveredAmount: number | null;
  recoveredAt?: string | null;

  recoveryStatus: string;
  recoveryAction: string | null;

  createdAt: string;
  updatedAt: string;
};

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
  status: "HEALTHY" | "DEGRADED";
  anomalyDetected: boolean;

  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;

  successRate: number;
  failureRate: number;

  reason: string;
};

type ActivityItem = {
  id: string;
  transactionId: string;
  paymentId: string;
  customerEmail: string;

  type: string;
  action: string;
  message: string;

  amount: number;
  createdAt: string;
};

type CommandCenterResponse = {
  success: boolean;
  generatedAt?: string;

  overview?: Overview;

  health?: Health;

  incidents?: {
    total: number;
    active: number;
    items: unknown[];
  };

  recoveryQueue?: {
    total: number;
    actionable: number;
    items: RecoveryCase[];
  };

  activity?: {
    total: number;
    items: ActivityItem[];
  };

  error?: string;
};

type ActionType =
  | "RETRY"
  | "PAYMENT_LINK"
  | "MARK_RECOVERED";

/* =========================================================
   EMPTY STATE
========================================================= */

const EMPTY_OVERVIEW: Overview = {
  activeIncidents: 0,
  totalIncidents: 0,

  revenueAtRisk: 0,
  recoverableRevenue: 0,
  recoveredRevenue: 0,

  recoveredCases: 0,
  activeRecoveryCases: 0,

  recoveryRate: 0,

  currency: "INR",
};

const EMPTY_HEALTH: Health = {
  status: "HEALTHY",
  anomalyDetected: false,

  totalEvents: 0,
  successfulEvents: 0,
  failedEvents: 0,

  successRate: 0,
  failureRate: 0,

  reason: "No system health data available.",
};

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const [data, setData] =
    useState<CommandCenterResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [analysisRunning, setAnalysisRunning] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [actionMessage, setActionMessage] =
    useState<string | null>(null);

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

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

      const text = await response.text();

      let result: CommandCenterResponse;

      try {
        result = text
          ? JSON.parse(text)
          : {
              success: false,
            };
      } catch {
        throw new Error(
          "Command Center API returned invalid JSON."
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Command Center failed (${response.status})`
        );
      }

      setData(result);

      if (!result.success) {
        setActionMessage(
          result.error ||
            "Unable to load Recovery Command Center."
        );
      } else {
        setActionMessage(null);
      }
    } catch (error) {
      console.error(
        "RECOVR dashboard error:",
        error
      );

      setData({
        success: false,
        overview: EMPTY_OVERVIEW,
        health: EMPTY_HEALTH,
        recoveryQueue: {
          total: 0,
          actionable: 0,
          items: [],
        },
        activity: {
          total: 0,
          items: [],
        },
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard.",
      });

      setActionMessage(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     RUN RECOVERY ANALYSIS
  ======================================================= */

  async function runRecoveryAnalysis() {
    try {
      setAnalysisRunning(true);
      setActionMessage(null);

      const response = await fetch(
        "/api/orchestrate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const text = await response.text();

      let result: {
        success?: boolean;
        error?: string;
      } = {};

      try {
        result = text
          ? JSON.parse(text)
          : {};
      } catch {
        throw new Error(
          "Recovery analysis returned invalid JSON."
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Recovery analysis failed."
        );
      }

      await loadDashboard();

      setActionMessage(
        "Recovery analysis completed successfully."
      );
    } catch (error) {
      console.error(
        "RECOVR analysis error:",
        error
      );

      setActionMessage(
        error instanceof Error
          ? error.message
          : "Recovery analysis failed."
      );
    } finally {
      setAnalysisRunning(false);
    }
  }

  /* =======================================================
     EXECUTE RECOVERY
  ======================================================= */

  async function executeRecovery(
    transactionId: string,
    action: ActionType
  ) {
    try {
      setActionLoading(transactionId);
      setActionMessage(null);

      const response = await fetch(
        "/api/recovery/execute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            transactionId,
            action,
          }),
        }
      );

      const text = await response.text();

      let result: {
        success?: boolean;
        error?: string;
      } = {};

      try {
        result = text
          ? JSON.parse(text)
          : {};
      } catch {
        throw new Error(
          "Recovery execution returned invalid JSON."
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Recovery action failed."
        );
      }

      if (action === "RETRY") {
        setActionMessage(
          "Payment retry scheduled successfully."
        );
      } else if (
        action === "PAYMENT_LINK"
      ) {
        setActionMessage(
          "Payment link generated successfully."
        );
      } else {
        setActionMessage(
          "Payment marked as recovered successfully."
        );
      }

      await loadDashboard();
    } catch (error) {
      console.error(
        "RECOVR execution error:",
        error
      );

      setActionMessage(
        error instanceof Error
          ? error.message
          : "Recovery action failed."
      );
    } finally {
      setActionLoading(null);
    }
  }

  /* =======================================================
     NORMALIZED DATA
  ======================================================= */

  const overview: Overview = {
    ...EMPTY_OVERVIEW,
    ...(data?.overview ?? {}),
  };

  const health: Health = {
    ...EMPTY_HEALTH,
    ...(data?.health ?? {}),
  };

  const recoveryCases: RecoveryCase[] =
    Array.isArray(
      data?.recoveryQueue?.items
    )
      ? data.recoveryQueue.items
      : [];

  /*
   * IMPORTANT:
   *
   * Your old dashboard only showed recoveryQueue.
   * That excludes already recovered transactions.
   *
   * We therefore get recovered information from
   * overview + activity.
   */

  const activity: ActivityItem[] =
    Array.isArray(data?.activity?.items)
      ? data.activity.items
      : [];

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredCases =
    useMemo(() => {
      const query =
        search
          .toLowerCase()
          .trim();

      if (!query) {
        return recoveryCases;
      }

      return recoveryCases.filter(
        (item) =>
          item.paymentId
            ?.toLowerCase()
            .includes(query) ||
          item.customerEmail
            ?.toLowerCase()
            .includes(query) ||
          (
            item.failureReason ??
            ""
          )
            .toLowerCase()
            .includes(query) ||
          item.recommendation
            ?.toLowerCase()
            .includes(query)
      );
    }, [recoveryCases, search]);

  /* =======================================================
     VALUES
  ======================================================= */

  const revenueAtRisk =
    Number(
      overview.revenueAtRisk
    ) || 0;

  const recoveredRevenue =
    Number(
      overview.recoveredRevenue
    ) || 0;

  const recoveredCases =
    Number(
      overview.recoveredCases
    ) || 0;

  const activeRecoveryCases =
    Number(
      overview.activeRecoveryCases
    ) || 0;

  const recoveryRate =
    Number(
      overview.recoveryRate
    ) || 0;

  const totalTransactions =
    Number(
      health.totalEvents
    ) || 0;

  const failedTransactions =
    Number(
      health.failedEvents
    ) || 0;

  /* =======================================================
     FAILURE BREAKDOWN
  ======================================================= */

  const failureBreakdown =
    getFailureBreakdown(
      recoveryCases
    );

  /* =======================================================
     RECENT RECOVERY ACTIVITY
  ======================================================= */

  const recoveryActivity =
    activity.filter(
      (item) =>
        item.type?.includes(
          "RECOVERY"
        ) ||
        item.action
    );

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-[#111]">

      {/* =================================================
          HEADER
      ================================================= */}

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
              href="/command-center"
              className="text-[#5f5cff]"
            >
              Command Center
            </a>

            <a
              href="/cases"
              className="transition hover:text-[#5f5cff]"
            >
              Recovery Cases
            </a>

            <a
              href="/analytics"
              className="transition hover:text-[#5f5cff]"
            >
              Analytics
            </a>

            <a
              href="/audit"
              className="transition hover:text-[#5f5cff]"
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

      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8 md:py-10">

        {/* TITLE */}

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

        {/* MESSAGE */}

        {actionMessage && (
          <div className="mt-5 rounded-xl border border-black/10 bg-white px-4 py-3 text-[10px] font-semibold">
            {actionMessage}
          </div>
        )}

        {/* =================================================
            METRICS
        ================================================= */}

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <MetricCard
            label="Revenue At Risk"
            value={
              loading
                ? "—"
                : formatINR(
                    revenueAtRisk
                  )
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
                : formatINR(
                    recoveredRevenue
                  )
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
                : String(
                    activeRecoveryCases
                  )
            }
            change={`${totalTransactions} total events`}
            icon={Zap}
          />

        </div>

        {/* =================================================
            RECOVERY SUCCESS BANNER
        ================================================= */}

        {recoveredCases > 0 && (
          <section className="mt-6 rounded-[24px] border border-[#177245]/15 bg-[#eaf8ef] p-6">

            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#177245] text-white">
                  <Check size={20} />
                </div>

                <div>

                  <div className="text-[9px] font-bold tracking-[0.18em] text-[#177245]">
                    RECOVERY SUCCESS
                  </div>

                  <div className="mt-1 text-[20px] font-black">
                    Revenue successfully recovered
                  </div>

                  <div className="mt-1 text-[10px] text-black/60">
                    RECOVR has successfully recovered{" "}
                    {recoveredCases}{" "}
                    transaction
                    {recoveredCases !== 1
                      ? "s"
                      : ""}{" "}
                    through the recovery workflow.
                  </div>

                </div>

              </div>

              <div className="text-left md:text-right">

                <div className="text-[28px] font-black tracking-[-0.05em]">
                  {formatINR(
                    recoveredRevenue
                  )}
                </div>

                <div className="text-[9px] font-bold text-[#177245]">
                  RECOVERED REVENUE
                </div>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            PERFORMANCE + RISK
        ================================================= */}

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">

          {/* PERFORMANCE */}

          <section className="rounded-[24px] border border-black/10 bg-white p-5 md:p-7">

            <div className="flex items-start justify-between">

              <div>

                <div className="text-[9px] font-bold tracking-[0.18em] text-black/50">
                  RECOVERY PERFORMANCE
                </div>

                <div className="mt-2 text-[22px] font-black tracking-[-0.04em]">
                  Revenue recovery
                </div>

              </div>

              <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px]">
                Live dataset
              </div>

            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">

              <PerformanceStat
                label="Recovered Revenue"
                value={formatINR(
                  recoveredRevenue
                )}
              />

              <PerformanceStat
                label="Revenue At Risk"
                value={formatINR(
                  revenueAtRisk
                )}
              />

              <PerformanceStat
                label="Recovery Rate"
                value={`${recoveryRate}%`}
              />

            </div>

            {/* BAR */}

            <div className="mt-8">

              <div className="mb-2 flex justify-between text-[9px] font-bold">
                <span className="text-black/50">
                  RECOVERY PROGRESS
                </span>

                <span>
                  {recoveryRate}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-black/5">

                <div
                  className="h-full rounded-full bg-[#5f5cff] transition-all"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        recoveryRate,
                        100
                      )
                    )}%`,
                  }}
                />

              </div>

            </div>

            {/* HEALTH */}

            <div className="mt-8 flex items-center justify-between rounded-xl bg-[#f5f5f0] px-4 py-3">

              <div className="flex items-center gap-2">

                <div
                  className={`h-2 w-2 rounded-full ${
                    health.status ===
                    "HEALTHY"
                      ? "bg-[#177245]"
                      : "bg-[#d95d5d]"
                  }`}
                />

                <span className="text-[10px] font-bold">
                  System{" "}
                  {health.status ===
                  "HEALTHY"
                    ? "healthy"
                    : "degraded"}
                </span>

              </div>

              <span className="text-[9px] text-black/50">
                {health.successRate}% success rate
              </span>

            </div>

          </section>

          {/* RISK */}

          <section className="rounded-[24px] bg-[#111] p-6 text-white md:p-7">

            <div className="text-[9px] font-bold tracking-[0.18em] text-white/35">
              REVENUE AT RISK
            </div>

            <div className="mt-4 text-[42px] font-black tracking-[-0.06em]">
              {loading
                ? "—"
                : formatINR(
                    revenueAtRisk
                  )}
            </div>

            <div className="mt-2 flex items-center gap-2 text-[10px] text-[#ff9898]">
              <ArrowDownRight size={13} />
              Based on current failed transactions
            </div>

            <div className="mt-10 space-y-4">

              {failureBreakdown.length >
              0 ? (
                failureBreakdown.map(
                  (item) => (
                    <RiskRow
                      key={item.label}
                      label={item.label}
                      amount={formatINR(
                        item.amount
                      )}
                      percentage={
                        item.percentage
                      }
                    />
                  )
                )
              ) : (
                <div className="rounded-xl bg-white/5 p-4 text-[10px] text-white/50">
                  No active failed-payment risk.
                </div>
              )}

            </div>

          </section>

        </div>

        {/* =================================================
            RECOVERY QUEUE
        ================================================= */}

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
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search cases..."
                className="w-full bg-transparent text-[10px] outline-none placeholder:text-black/40"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}

            </div>

          </div>

          {loading ? (
            <div className="p-10 text-center text-[11px] text-black/50">
              Loading recovery cases...
            </div>
          ) : filteredCases.length ===
            0 ? (
            <div className="p-10 text-center">

              <div className="text-[12px] font-bold">
                No active recovery cases
              </div>

              <div className="mt-1 text-[10px] text-black/40">
                RECOVR currently has no
                failed transactions requiring
                intervention.
              </div>

            </div>
          ) : (
            <>

              <div className="hidden grid-cols-[1fr_1.2fr_1fr_0.7fr_1.2fr] gap-4 border-b border-black/10 px-6 py-3 text-[8px] font-bold tracking-wider text-black/50 md:grid">

                <span>CASE</span>
                <span>CUSTOMER</span>
                <span>AMOUNT</span>
                <span>RECOVERY</span>
                <span>ACTION</span>

              </div>

              {filteredCases.map(
                (item) => (
                  <RecoveryCaseRow
                    key={item.id}
                    item={item}
                    actionLoading={
                      actionLoading
                    }
                    onExecute={
                      executeRecovery
                    }
                  />
                )
              )}

            </>
          )}

        </section>

        {/* =================================================
            RECOVERED TRANSACTIONS
        ================================================= */}

        <section className="mt-6 rounded-[24px] border border-black/10 bg-white">

          <div className="border-b border-black/10 p-5 md:p-6">

            <div className="text-[9px] font-bold tracking-[0.18em] text-[#177245]">
              SUCCESSFUL RECOVERIES
            </div>

            <div className="mt-1 text-lg font-black">
              Recovered Transactions
            </div>

            <div className="mt-1 text-[10px] text-black/50">
              Transactions successfully recovered by RECOVR.
            </div>

          </div>

          {recoveredCases === 0 ? (
            <div className="p-10 text-center text-[10px] text-black/40">
              No recovered transactions yet.
            </div>
          ) : (
            <div className="divide-y divide-black/10">

              {getRecoveredActivity(
                activity
              )
                .slice(0, 10)
                .map((item) => (
                  <RecoveredRow
                    key={item.id}
                    item={item}
                  />
                ))}

              {getRecoveredActivity(
                activity
              ).length === 0 && (
                <div className="p-10 text-center text-[10px] text-black/40">
                  {recoveredCases} recovered case
                  {recoveredCases !== 1
                    ? "s"
                    : ""}{" "}
                  recorded, but detailed
                  recovery activity is not
                  available.
                </div>
              )}

            </div>
          )}

        </section>

        {/* =================================================
            INTELLIGENCE + POLICY
        ================================================= */}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">

          {/* INTELLIGENCE */}

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

                {failedTransactions > 0
                  ? "Payment failures detected"
                  : "No active failure pattern"}

              </div>

              <p className="mt-2 text-[10px] leading-5 text-black/60">

                {failedTransactions >
                0
                  ? `${failedTransactions} failed transaction${
                      failedTransactions !==
                      1
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

          {/* POLICY */}

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

                {health.status ===
                "HEALTHY"
                  ? "System healthy"
                  : "System degraded"}

              </div>

              <span className="text-[9px] text-white/30">
                {health.anomalyDetected
                  ? "Anomaly detected"
                  : "0 policy violations"}
              </span>

            </div>

          </section>

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

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

/* =========================================================
   RECOVERY CASE ROW
========================================================= */

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
            {Math.round(
              item.confidence * 100
            )}
            %
          </div>

        </div>

        <div>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-[8px] font-bold ${
              item.recommendation ===
              "REVIEW"
                ? "bg-[#fff4df] text-[#9a6500]"
                : "bg-[#eaf8ef] text-[#177245]"
            }`}
          >
            {formatRecommendation(
              item.recommendation
            )}
          </span>

        </div>

      </div>

      <div className="mt-4 rounded-xl bg-[#f5f5f0] px-4 py-3 text-[9px] leading-4 text-black/60">

        <span className="font-bold text-black">
          Reason:
        </span>{" "}

        {item.reason ||
          item.failureReason ||
          "No recovery reason available."}

      </div>

      {item.recoverable &&
        item.recommendation !==
          "REVIEW" &&
        item.recommendation !==
          "NO_ACTION" && (

        <div className="mt-4 flex flex-wrap gap-2">

          {hasExecuted ? (
            <div className="rounded-lg bg-[#eaf8ef] px-4 py-2 text-[9px] font-bold text-[#177245]">
              {item.recoveryStatus ===
              "RETRY_SCHEDULED"
                ? "Retry scheduled"
                : "Payment link generated"}
            </div>
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={() =>
                void onExecute(
                  item.id,
                  item.recommendation ===
                    "RETRY"
                    ? "RETRY"
                    : "PAYMENT_LINK"
                )
              }
              className="rounded-lg bg-[#111] px-4 py-2 text-[9px] font-bold text-white transition hover:bg-[#5f5cff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? "Processing..."
                : item.recommendation ===
                  "RETRY"
                ? "Schedule Retry"
                : "Generate Payment Link"}
            </button>
          )}

        </div>

      )}

    </div>
  );
}

/* =========================================================
   RECOVERED ROW
========================================================= */

function RecoveredRow({
  item,
}: {
  item: ActivityItem;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:px-6">

      <div className="flex items-center gap-4">

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf8ef] text-[#177245]">
          <Check size={16} />
        </div>

        <div>

          <div className="text-[8px] font-bold tracking-wider text-black/40">
            PAYMENT
          </div>

          <div className="mt-1 text-[11px] font-bold">
            {item.paymentId}
          </div>

          <div className="mt-1 text-[9px] text-black/50">
            {item.customerEmail}
          </div>

        </div>

      </div>

      <div className="text-left md:text-right">

        <div className="text-[17px] font-black">
          {formatINR(
            item.amount
          )}
        </div>

        <div className="mt-1 text-[8px] font-bold text-[#177245]">
          ✓ RECOVERED
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   METRIC CARD
========================================================= */

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

/* =========================================================
   PERFORMANCE STAT
========================================================= */

function PerformanceStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#f5f5f0] p-4">

      <div className="text-[8px] font-bold tracking-wider text-black/40">
        {label}
      </div>

      <div className="mt-2 text-[20px] font-black tracking-[-0.04em]">
        {value}
      </div>

    </div>
  );
}

/* =========================================================
   RISK ROW
========================================================= */

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

/* =========================================================
   POLICY ROW
========================================================= */

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

/* =========================================================
   HELPERS
========================================================= */

function formatINR(
  amount: number
) {
  const safeAmount =
    Number.isFinite(
      amount
    )
      ? amount
      : 0;

  return `₹${safeAmount.toLocaleString(
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

    case "REVIEW":
      return "Review Required";

    case "NO_ACTION":
      return "No Action";

    default:
      return "No Action";
  }
}

/* =========================================================
   FAILURE BREAKDOWN
========================================================= */

function getFailureBreakdown(
  cases: RecoveryCase[]
) {
  const map =
    new Map<string, number>();

  cases.forEach((item) => {
    const reason =
      item.failureReason ||
      "Other";

    map.set(
      reason,
      (map.get(reason) || 0) +
        (Number(item.amount) || 0)
    );
  });

  const total =
    cases.reduce(
      (sum, item) =>
        sum +
        (Number(item.amount) || 0),
      0
    );

  return Array.from(
    map.entries()
  )
    .map(
      ([label, amount]) => ({
        label,
        amount,
        percentage:
          total > 0
            ? Math.round(
                (amount / total) *
                  100
              )
            : 0,
      })
    )
    .sort(
      (a, b) =>
        b.amount -
        a.amount
    );
}

/* =========================================================
   RECOVERED ACTIVITY
========================================================= */

function getRecoveredActivity(
  activity: ActivityItem[]
) {
  return activity.filter(
    (item) => {
      const text = `
        ${item.type}
        ${item.action}
        ${item.message}
      `.toLowerCase();

      return (
        text.includes(
          "recovered"
        ) ||
        text.includes(
          "recovery_success"
        ) ||
        text.includes(
          "payment recovered"
        ) ||
        text.includes(
          "successfully"
        )
      );
    }
  );
}