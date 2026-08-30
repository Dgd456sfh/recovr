"use client";

import { useCallback, useEffect, useState } from "react";

type RecoveryResult = {
  transactionId: string;
  paymentId: string;
  customerEmail: string;
  amount: number;
  currency: string;
  failureReason: string | null;
  channel: string | null;
  provider: string | null;
  recommendation: "RETRY" | "PAYMENT_LINK" | "WAIT" | "REVIEW";
  recoveryProbability: number;
  expectedRecoveredRevenue: number;
  confidence: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  reasoning: string;

  guardrails?: {
    originalAction: string;
    finalAction: string;
    overridden: boolean;
    approved: boolean;
    triggered: string[];
    reasons: string[];
  };

  orchestration?: {
    action: string;
    recoveryStatus: string;
    message: string;
  };

  simulated?: boolean;
};

type RecoveryResponse = {
  success: boolean;
  processed: number;
  revenueAtRisk: number;
  expectedRecoveredRevenue: number;

  summary?: {
    approvedActions: number;
    guardrailsOverridden: number;
    reviewRequired: number;
    waiting: number;
    retries: number;
    paymentLinks: number;
  };

  results: RecoveryResult[];
  message?: string;
  error?: string;
};

type CommandCenterResponse = {
  success: boolean;
  overview?: any;
  health?: any;
  incidents?: any[];
  recoveryQueue?: any;
  activity?: any;
  generatedAt?: string;
  error?: string;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function actionClass(action: string) {
  switch (action) {
    case "RETRY":
      return "bg-black text-white";

    case "PAYMENT_LINK":
      return "bg-[#5f5cff] text-white";

    case "WAIT":
      return "bg-yellow-100 text-black";

    case "REVIEW":
    default:
      return "bg-red-100 text-black";
  }
}

function riskClass(risk: string) {
  switch (risk) {
    case "LOW":
      return "bg-green-100";

    case "HIGH":
      return "bg-red-100";

    case "MEDIUM":
    default:
      return "bg-yellow-100";
  }
}

export default function CommandCenterPage() {
  const [data, setData] =
    useState<CommandCenterResponse | null>(null);

  const [recovery, setRecovery] =
    useState<RecoveryResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [runningAI, setRunningAI] =
    useState(false);

  const [error, setError] =
    useState("");

  const [recoveryError, setRecoveryError] =
    useState("");

  const loadCommandCenter = useCallback(
    async () => {
      try {
        setError("");

        const response = await fetch(
          "/api/command-center",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load command center"
          );
        }

        const result =
          (await response.json()) as CommandCenterResponse;

        if (!result.success) {
          throw new Error(
            result.error ||
              "Unable to load command center"
          );
        }

        setData(result);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load RECOVR command center."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  async function runAIRecovery() {
    try {
      setRunningAI(true);
      setRecoveryError("");

      const response = await fetch(
        "/api/recovery/ai",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as RecoveryResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "AI recovery analysis failed."
        );
      }

      setRecovery(result);

      await loadCommandCenter();
    } catch (err) {
      console.error(err);

      setRecoveryError(
        err instanceof Error
          ? err.message
          : "AI recovery analysis failed."
      );
    } finally {
      setRunningAI(false);
    }
  }

  useEffect(() => {
    loadCommandCenter();

    const interval = setInterval(() => {
      loadCommandCenter();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadCommandCenter]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-10 text-black md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse">
            <div className="h-4 w-32 rounded bg-black/10" />

            <div className="mt-4 h-16 w-[520px] max-w-full rounded bg-black/10" />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-36 rounded-3xl border border-black/10 bg-white"
                />
              ))}
            </div>

            <div className="mt-6 h-48 rounded-3xl border border-black/10 bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-10 text-black md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border-2 border-black bg-white p-8">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#5f5cff]">
              RECOVR
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Command Center unavailable
            </h1>

            <p className="mt-3 text-black/60">
              {error ||
                "Something went wrong while loading the dashboard."}
            </p>

            <button
              onClick={loadCommandCenter}
              className="mt-6 rounded-full border-2 border-black bg-[#5f5cff] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  const overview = data.overview || {};

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-8 text-black md:px-10 md:py-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <header className="flex flex-col justify-between gap-6 border-b-2 border-black pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#5f5cff]">
              RECOVR / COMMAND CENTER
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] md:text-7xl">
              Revenue
              <br />
              recovery control.
            </h1>

            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-black/60">
              Detect payment degradation, quantify revenue
              exposure, apply recovery intelligence and
              orchestrate safe recovery actions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-bold">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#5f5cff]" />
              LIVE
            </div>

            <button
              onClick={loadCommandCenter}
              className="rounded-full border-2 border-black bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5f5cff]"
            >
              Refresh
            </button>

            <button
              onClick={runAIRecovery}
              disabled={runningAI}
              className="rounded-full border-2 border-black bg-[#5f5cff] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {runningAI
                ? "AI ANALYZING..."
                : "Run AI Recovery"}
            </button>
          </div>
        </header>

        {/* AI ERROR */}

        {recoveryError && (
          <div className="mt-6 rounded-3xl border-2 border-red-600 bg-red-50 p-5">
            <p className="text-sm font-black uppercase tracking-[0.15em] text-red-600">
              AI RECOVERY ERROR
            </p>

            <p className="mt-2 font-medium">
              {recoveryError}
            </p>
          </div>
        )}

        {/* OVERVIEW */}

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-3xl border-2 border-black bg-white p-6">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-black/50">
              Revenue at risk
            </p>

            <p className="mt-4 text-4xl font-black tracking-[-0.04em]">
              {formatINR(
                recovery?.revenueAtRisk ??
                  Number(
                    overview.revenueAtRisk ?? 0
                  )
              )}
            </p>

            <p className="mt-2 text-sm font-medium text-black/50">
              Failed recoverable revenue
            </p>
          </div>

          <div className="rounded-3xl border-2 border-black bg-white p-6">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-black/50">
              Expected recovery
            </p>

            <p className="mt-4 text-4xl font-black tracking-[-0.04em]">
              {formatINR(
                recovery?.expectedRecoveredRevenue ??
                  Number(
                    overview.expectedRecoveredRevenue ??
                      0
                  )
              )}
            </p>

            <p className="mt-2 text-sm font-medium text-black/50">
              AI-estimated recovered value
            </p>
          </div>

          <div className="rounded-3xl border-2 border-black bg-white p-6">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-black/50">
              Failed payments
            </p>

            <p className="mt-4 text-4xl font-black tracking-[-0.04em]">
              {recovery?.processed ??
                Number(
                  overview.failedPayments ??
                    overview.failed ??
                    0
                )}
            </p>

            <p className="mt-2 text-sm font-medium text-black/50">
              Recoverable transactions
            </p>
          </div>

          <div className="rounded-3xl border-2 border-black bg-[#5f5cff] p-6 text-white">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-white/70">
              AI status
            </p>

            <p className="mt-4 text-4xl font-black tracking-[-0.04em]">
              {recovery
                ? "ACTIVE"
                : "READY"}
            </p>

            <p className="mt-2 text-sm font-medium text-white/70">
              {recovery
                ? `${recovery.processed} payments analyzed`
                : "Ready for recovery analysis"}
            </p>
          </div>
        </section>

        {/* AI SUMMARY */}

        {recovery?.summary && (
          <section className="mt-6 rounded-3xl border-2 border-black bg-black p-6 text-white">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a9a7ff]">
                  AI RECOVERY SUMMARY
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Decision engine complete.
                </h2>
              </div>

              <div className="text-sm font-bold text-white/60">
                {recovery.processed} transactions analyzed
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">

              <div className="rounded-2xl border border-white/20 p-4">
                <p className="text-xs text-white/50">
                  Approved
                </p>
                <p className="mt-2 text-2xl font-black">
                  {recovery.summary.approvedActions}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 p-4">
                <p className="text-xs text-white/50">
                  Overridden
                </p>
                <p className="mt-2 text-2xl font-black">
                  {recovery.summary.guardrailsOverridden}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 p-4">
                <p className="text-xs text-white/50">
                  Review
                </p>
                <p className="mt-2 text-2xl font-black">
                  {recovery.summary.reviewRequired}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 p-4">
                <p className="text-xs text-white/50">
                  Waiting
                </p>
                <p className="mt-2 text-2xl font-black">
                  {recovery.summary.waiting}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 p-4">
                <p className="text-xs text-white/50">
                  Retries
                </p>
                <p className="mt-2 text-2xl font-black">
                  {recovery.summary.retries}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 p-4">
                <p className="text-xs text-white/50">
                  Payment links
                </p>
                <p className="mt-2 text-2xl font-black">
                  {recovery.summary.paymentLinks}
                </p>
              </div>

            </div>
          </section>
        )}

        {/* RECOVERY DECISIONS */}

        {recovery && recovery.results.length > 0 && (
          <section className="mt-6">

            <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5f5cff]">
                  RECOVERY INTELLIGENCE
                </p>

                <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">
                  AI decisions
                </h2>
              </div>

              <p className="text-sm font-medium text-black/50">
                Gemini → Guardrails → Orchestrator
              </p>
            </div>

            <div className="space-y-4">

              {recovery.results.map(
                (item) => (
                  <article
                    key={item.transactionId}
                    className="rounded-3xl border-2 border-black bg-white p-6"
                  >

                    {/* TOP */}

                    <div className="flex flex-col justify-between gap-5 lg:flex-row">

                      <div>
                        <div className="flex flex-wrap items-center gap-2">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${actionClass(
                              item.recommendation
                            )}`}
                          >
                            {item.recommendation}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${riskClass(
                              item.risk
                            )}`}
                          >
                            {item.risk} RISK
                          </span>

                          {item.guardrails?.approved && (
                            <span className="rounded-full border border-black px-3 py-1 text-xs font-black">
                              GUARDRAIL APPROVED
                            </span>
                          )}

                        </div>

                        <h3 className="mt-4 text-xl font-black">
                          {item.paymentId}
                        </h3>

                        <p className="mt-1 text-sm font-medium text-black/50">
                          {item.customerEmail}
                        </p>
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-black/40">
                          Payment
                        </p>

                        <p className="mt-1 text-3xl font-black">
                          {formatINR(item.amount)}
                        </p>

                        <p className="mt-1 text-sm font-bold text-black/50">
                          {percent(
                            item.recoveryProbability
                          )}{" "}
                          recovery probability
                        </p>
                      </div>

                    </div>

                    {/* DETAILS */}

                    <div className="mt-6 grid gap-3 md:grid-cols-4">

                      <div className="rounded-2xl bg-[#f5f5f0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-black/40">
                          Failure
                        </p>

                        <p className="mt-2 font-bold">
                          {item.failureReason ||
                            "Unknown"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#f5f5f0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-black/40">
                          Provider
                        </p>

                        <p className="mt-2 font-bold">
                          {item.provider ||
                            "Unknown"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#f5f5f0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-black/40">
                          Confidence
                        </p>

                        <p className="mt-2 font-bold">
                          {percent(item.confidence)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#f5f5f0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-black/40">
                          Expected recovery
                        </p>

                        <p className="mt-2 font-bold">
                          {formatINR(
                            item.expectedRecoveredRevenue
                          )}
                        </p>
                      </div>

                    </div>

                    {/* REASONING */}

                    <div className="mt-4 rounded-2xl border border-black/10 bg-[#f7f7f2] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-black/40">
                        AI reasoning
                      </p>

                      <p className="mt-2 text-sm font-medium leading-6">
                        {item.reasoning}
                      </p>
                    </div>

                    {/* GUARDRAILS */}

                    {item.guardrails && (
                      <div className="mt-4 rounded-2xl border-2 border-black p-4">

                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5f5cff]">
                              Safety layer
                            </p>

                            <p className="mt-1 font-black">
                              {item.guardrails.overridden
                                ? "Action overridden by guardrails"
                                : "AI action approved"}
                            </p>
                          </div>

                          <div className="text-sm font-bold">
                            {item.guardrails.originalAction}
                            {" → "}
                            {item.guardrails.finalAction}
                          </div>

                        </div>

                        {item.guardrails.triggered.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.guardrails.triggered.map(
                              (trigger) => (
                                <span
                                  key={trigger}
                                  className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white"
                                >
                                  {trigger}
                                </span>
                              )
                            )}
                          </div>
                        )}

                      </div>
                    )}

                    {/* ORCHESTRATION */}

                    {item.orchestration && (
                      <div className="mt-4 flex flex-col justify-between gap-4 rounded-2xl bg-[#5f5cff] p-5 text-white md:flex-row md:items-center">

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-white/60">
                            Orchestration
                          </p>

                          <p className="mt-1 text-lg font-black">
                            {item.orchestration.recoveryStatus}
                          </p>

                          <p className="mt-1 text-sm font-medium text-white/70">
                            {item.orchestration.message}
                          </p>
                        </div>

                        <div className="rounded-full border border-white/30 px-4 py-2 text-xs font-black">
                          {item.orchestration.action}
                        </div>

                      </div>
                    )}

                  </article>
                )
              )}

            </div>
          </section>
        )}

        {/* EXISTING COMMAND CENTER COMPONENTS */}

        {!recovery && (
          <>
            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border-2 border-black bg-white p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5f5cff]">
                  SYSTEM
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Recovery engine ready.
                </h2>

                <p className="mt-3 text-sm font-medium leading-6 text-black/60">
                  Run AI Recovery to analyze all recoverable
                  failed payments using payment history,
                  provider context, incident severity and
                  recovery guardrails.
                </p>

                <button
                  onClick={runAIRecovery}
                  disabled={runningAI}
                  className="mt-6 rounded-full border-2 border-black bg-[#5f5cff] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {runningAI
                    ? "Analyzing..."
                    : "Analyze recoverable payments"}
                </button>
              </div>

              <div className="rounded-3xl border-2 border-black bg-white p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5f5cff]">
                  PIPELINE
                </p>

                <div className="mt-5 space-y-3">

                  {[
                    "Payment failure detected",
                    "Incident context loaded",
                    "Gemini recovery decision",
                    "Guardrail evaluation",
                    "Recovery orchestration",
                  ].map((step, index) => (
                    <div
                      key={step}
                      className="flex items-center gap-3"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black text-xs font-black">
                        {index + 1}
                      </span>

                      <span className="text-sm font-bold">
                        {step}
                      </span>
                    </div>
                  ))}

                </div>
              </div>
            </section>
          </>
        )}

        {/* FOOTER */}

        <footer className="mt-10 flex flex-col justify-between gap-3 border-t-2 border-black py-6 text-xs font-bold uppercase tracking-[0.14em] text-black/50 md:flex-row">
          <span>
            RECOVR Revenue Intelligence
          </span>

          <span>
            Updated{" "}
            {data.generatedAt
              ? new Date(
                  data.generatedAt
                ).toLocaleString()
              : "—"}
          </span>
        </footer>

      </div>
    </main>
  );
}