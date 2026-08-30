"use client";

import { useEffect, useState } from "react";

type Recommendation =
  | "RETRY"
  | "PAYMENT_LINK"
  | "REVIEW"
  | "NO_ACTION";

type RecoveryEvent = {
  id: string;
  transactionId: string;
  eventType: string;
  action: string | null;
  message: string;
  createdAt: string;
};

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
  recoveredAmount?: number | null;
  recoveredAt?: string | null;

  recoveryStatus: string;
  recoveryAction?: string | null;

  recommendation: Recommendation;
  confidence: number;
  reason: string;

  priority?: string;
  shouldRecover?: boolean;

  recoveryEvents?: RecoveryEvent[];

  createdAt: string;
  updatedAt: string;
};

type RecoveryResponse = {
  success: boolean;
  cases: RecoveryCase[];
  error?: string;
};

export default function CaseDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [item, setItem] = useState<RecoveryCase | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function resolveParams() {
      const resolved = await params;
      setCaseId(resolved.id);
    }

    void resolveParams();
  }, [params]);

  useEffect(() => {
    if (!caseId) return;
    void loadCase(caseId);
  }, [caseId]);

  async function loadCase(id: string) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/recovery", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as RecoveryResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to load recovery case."
        );
      }

      const selectedCase = result.cases.find(
        (recoveryCase) => recoveryCase.id === id
      );

      if (!selectedCase) {
        setItem(null);
        return;
      }

      setItem(selectedCase);
    } catch (err) {
      console.error("Case details error:", err);

      setItem(null);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this recovery case."
      );
    } finally {
      setLoading(false);
    }
  }

  async function executeRecoveryAction(
    action: "RETRY" | "PAYMENT_LINK"
  ) {
    if (!item || actionLoading) return;

    try {
      setActionLoading(true);
      setMessage("");
      setError("");

      const response = await fetch("/api/recovery", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          transactionId: item.id,
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Recovery action failed."
        );
      }

      if (action === "RETRY") {
        setMessage("Payment retry scheduled successfully.");
      } else {
        setMessage("Payment link generated successfully.");
      }

      await loadCase(item.id);
    } catch (err) {
      console.error("Recovery action error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to execute recovery action."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function evaluateOutcome() {
    if (!item || actionLoading) return;

    try {
      setActionLoading(true);
      setMessage("");
      setError("");

      const response = await fetch("/api/recovery/outcome", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          transactionId: item.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to evaluate recovery outcome."
        );
      }

      if (result.outcome === "RECOVERED") {
        setMessage(
          `Payment recovered successfully. ₹${Number(
            result.recoveredAmount
          ).toLocaleString("en-IN")} recovered.`
        );
      } else {
        setMessage(
          "Recovery action did not recover the payment. RECOVR marked the case for review."
        );
      }

      await loadCase(item.id);
    } catch (err) {
      console.error("Outcome evaluation error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to evaluate recovery outcome."
      );
    } finally {
      setActionLoading(false);
    }
  }

  function formatINR(amount: number) {
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  function formatDate(date: string) {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Unknown";
    }

    return parsed.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatStatus(status: string) {
    switch (status) {
      case "PAYMENT_LINK_GENERATED":
        return "Payment Link Generated";

      case "RETRY_SCHEDULED":
        return "Retry Scheduled";

      case "EXECUTED":
        return "Recovery Executed";

      case "RECOVERED":
        return "Recovered";

      case "RECOVERY_FAILED":
        return "Recovery Unsuccessful";

      case "NOT_REQUIRED":
        return "No Action Required";

      case "PENDING":
        return "Pending";

      default:
        return status.replaceAll("_", " ");
    }
  }

  function formatRecommendation(recommendation: string) {
    switch (recommendation) {
      case "RETRY":
        return "Retry Payment";

      case "PAYMENT_LINK":
        return "Generate Payment Link";

      case "REVIEW":
        return "Manual Review";

      case "NO_ACTION":
        return "No Action";

      default:
        return recommendation.replaceAll("_", " ");
    }
  }

  function formatEventType(value: string) {
    switch (value) {
      case "PAYMENT_LINK_GENERATED":
        return "Payment link generated";

      case "RETRY_SCHEDULED":
        return "Retry scheduled";

      case "PAYMENT_RECOVERED":
        return "Payment recovered";

      case "RECOVERY_ACTION":
        return "Recovery action initiated";

      case "RECOVERY_OUTCOME":
        return "Recovery outcome recorded";

      case "AUTONOMOUS_RECOVERY":
        return "Autonomous recovery executed";

      case "RECOVERY_REVIEW_REQUIRED":
        return "Manual review required";

      default:
        return value.replaceAll("_", " ");
    }
  }

  function getStatusStyle(status: string) {
    if (status === "RECOVERED") {
      return "bg-[#e9f8ef] text-[#167044] border-[#a9dfbd]";
    }

    if (status === "RECOVERY_FAILED") {
      return "bg-[#fff0f0] text-[#b42318] border-[#efb5b5]";
    }

    if (
      status === "RETRY_SCHEDULED" ||
      status === "PAYMENT_LINK_GENERATED" ||
      status === "EXECUTED"
    ) {
      return "bg-[#eeedff] text-[#5f5cff] border-[#bcbaff]";
    }

    if (status === "PENDING") {
      return "bg-[#fff4df] text-[#925f00] border-[#e7c983]";
    }

    return "bg-black/[0.06] text-black border-black/15";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f0] text-black">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-black/10 border-t-[#5f5cff]" />

          <div className="mt-5 text-[10px] font-black tracking-[0.2em]">
            LOADING RECOVERY CASE
          </div>

          <div className="mt-2 text-[10px] text-black/40">
            Fetching incident intelligence...
          </div>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f0] px-5 text-black">
        <div className="w-full max-w-md rounded-[28px] border-2 border-black bg-white p-9 text-center shadow-[6px_6px_0_#111]">
          <div className="text-[9px] font-black tracking-[0.2em] text-[#5f5cff]">
            RECOVERY SYSTEM
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-[-0.05em]">
            Case not found
          </h1>

          <p className="mt-3 text-[11px] leading-5 text-black/50">
            This recovery case could not be found in the current
            recovery dataset.
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-[10px] font-bold text-red-600">
              {error}
            </div>
          )}

          <a
            href="/cases"
            className="mt-7 inline-flex rounded-xl bg-black px-6 py-3 text-[10px] font-black text-white transition hover:bg-[#5f5cff]"
          >
            BACK TO CASES
          </a>
        </div>
      </main>
    );
  }

  const isRecovered =
    item.recovered ||
    item.status === "RECOVERED" ||
    item.recoveryStatus === "RECOVERED";

  const actionAlreadyExecuted =
    item.recoveryStatus === "RETRY_SCHEDULED" ||
    item.recoveryStatus === "PAYMENT_LINK_GENERATED" ||
    item.recoveryStatus === "EXECUTED";

  const outcomeFailed =
    item.recoveryStatus === "RECOVERY_FAILED";

  const outcomePending =
    actionAlreadyExecuted &&
    !isRecovered &&
    !outcomeFailed;

  const canExecuteAction =
    item.recoverable &&
    !isRecovered &&
    !actionAlreadyExecuted &&
    item.shouldRecover !== false;

  const events = [...(item.recoveryEvents ?? [])].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
  );

  const isNoAction = item.recommendation === "NO_ACTION";

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-black">
      {/* HEADER */}
      <header className="border-b-2 border-black bg-[#f5f5f0]">
        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between px-5 md:px-8">
          <a
            href="/"
            className="text-[22px] font-black tracking-[-0.09em]"
          >
            RECO
            <span className="text-[#5f5cff]">VR</span>
          </a>

          <nav className="hidden items-center gap-8 text-[10px] font-black md:flex">
            <a
              href="/dashboard"
              className="text-black/40 transition hover:text-black"
            >
              OVERVIEW
            </a>

            <a
              href="/cases"
              className="text-black"
            >
              CASES
            </a>

            <a
              href="/analytics"
              className="text-black/40 transition hover:text-black"
            >
              ANALYTICS
            </a>

            <a
              href="/audit"
              className="text-black/40 transition hover:text-black"
            >
              AUDIT LOG
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-[10px] font-black">
                Demo Merchant
              </div>

              <div className="text-[9px] font-semibold text-black/40">
                Razorpay Test Mode
              </div>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-[10px] font-black text-white">
              DM
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8 md:py-10">
        {/* BACK */}
        <a
          href="/cases"
          className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-3 py-2 text-[9px] font-black transition hover:border-black hover:bg-black hover:text-white"
        >
          ← BACK TO RECOVERY CASES
        </a>

        {/* HERO */}
        <section className="mt-7">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#5f5cff]" />

                <span className="text-[9px] font-black tracking-[0.2em] text-[#5f5cff]">
                  RECOVERY CASE
                </span>
              </div>

              <h1 className="mt-3 break-all text-[45px] font-black leading-none tracking-[-0.075em] md:text-[70px]">
                {item.paymentId}
              </h1>

              <p className="mt-4 max-w-2xl text-[12px] leading-5 text-black/50">
                Recovery intelligence, execution and audit trail
                for this payment incident.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="text-[8px] font-black tracking-[0.16em] text-black/40">
                CURRENT RECOVERY STATE
              </div>

              <div
                className={`rounded-full border px-5 py-2.5 text-[9px] font-black tracking-[0.12em] ${getStatusStyle(
                  item.recoveryStatus
                )}`}
              >
                {formatStatus(
                  item.recoveryStatus
                ).toUpperCase()}
              </div>
            </div>
          </div>
        </section>

        {/* NOTIFICATION */}
        {message && (
          <div className="mt-7 flex items-start gap-3 rounded-2xl border-2 border-[#177245] bg-[#eaf8ef] px-5 py-4 text-[10px] font-bold text-[#177245]">
            <span className="font-black">✓</span>
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mt-7 flex items-start gap-3 rounded-2xl border-2 border-[#b42318] bg-[#fff0f0] px-5 py-4 text-[10px] font-bold text-[#b42318]">
            <span className="font-black">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* METRICS */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="AMOUNT AT RISK"
            value={formatINR(item.amount)}
            accent
          />

          <MetricCard
            label="RECOVERY CONFIDENCE"
            value={`${item.confidence}%`}
            subtext={
              item.confidence >= 80
                ? "HIGH CONFIDENCE"
                : item.confidence >= 50
                ? "MEDIUM CONFIDENCE"
                : "LOW CONFIDENCE"
            }
          />

          <MetricCard
            label="PRIORITY"
            value={(item.priority ?? "—").toUpperCase()}
            subtext={
              item.priority
                ? "CASE PRIORITIZATION"
                : "NOT ASSIGNED"
            }
          />

          <MetricCard
            label="RECOMMENDATION"
            value={formatRecommendation(
              item.recommendation
            )}
            subtext={
              item.shouldRecover
                ? "AUTOMATION ELIGIBLE"
                : "NO AUTOMATIC ACTION"
            }
          />
        </section>

        {/* MAIN GRID */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_.85fr]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* INCIDENT */}
            <section className="overflow-hidden rounded-[28px] border-2 border-black bg-white">
              <div className="border-b-2 border-black bg-black px-6 py-5 text-white md:px-7">
                <div className="text-[9px] font-black tracking-[0.2em] text-[#a7a5ff]">
                  INCIDENT ANALYSIS
                </div>

                <div className="mt-2 text-[24px] font-black tracking-[-0.05em]">
                  What happened?
                </div>

                <div className="mt-1 text-[10px] text-white/45">
                  Transaction-level context and failure intelligence.
                </div>
              </div>

              <div className="grid md:grid-cols-2">
                <InfoBlock
                  label="PAYMENT STATUS"
                  value={item.status}
                  icon="01"
                />

                <InfoBlock
                  label="FAILURE REASON"
                  value={
                    item.failureReason ??
                    "No failure detected"
                  }
                  icon="02"
                />

                <InfoBlock
                  label="CUSTOMER"
                  value={item.customerEmail}
                  icon="03"
                />

                <InfoBlock
                  label="CREATED"
                  value={formatDate(item.createdAt)}
                  icon="04"
                />
              </div>
            </section>

            {/* DECISION ENGINE */}
            <section className="overflow-hidden rounded-[28px] border-2 border-black bg-black text-white">
              <div className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="text-[9px] font-black tracking-[0.2em] text-[#a7a5ff]">
                      RECOVR DECISION ENGINE
                    </div>

                    <h2 className="mt-2 text-[28px] font-black tracking-[-0.055em]">
                      Recovery recommendation
                    </h2>
                  </div>

                  <div className="hidden h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#a7a5ff] md:flex">
                    ✦
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <div className="text-[9px] font-black tracking-[0.16em] text-white/35">
                    ENGINE REASONING
                  </div>

                  <p className="mt-3 max-w-3xl text-[12px] leading-6 text-white/65">
                    {item.reason}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <DarkMetric
                    label="ACTION"
                    value={formatRecommendation(
                      item.recommendation
                    )}
                  />

                  <DarkMetric
                    label="CONFIDENCE"
                    value={`${item.confidence}%`}
                  />

                  <DarkMetric
                    label="AUTOMATION"
                    value={
                      item.shouldRecover
                        ? "ELIGIBLE"
                        : "BLOCKED"
                    }
                  />
                </div>
              </div>
            </section>

            {/* TIMELINE */}
            <section className="rounded-[28px] border-2 border-black bg-white">
              <div className="border-b border-black/15 px-6 py-6 md:px-7">
                <div className="text-[9px] font-black tracking-[0.2em] text-[#5f5cff]">
                  RECOVERY TIMELINE
                </div>

                <h2 className="mt-2 text-[25px] font-black tracking-[-0.05em]">
                  Audit trail
                </h2>

                <p className="mt-1 text-[10px] text-black/40">
                  Every recovery decision and execution event.
                </p>
              </div>

              {events.length === 0 ? (
                <div className="p-7">
                  <div className="rounded-2xl border-2 border-dashed border-black/20 bg-[#f5f5f0] p-7 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                      —
                    </div>

                    <div className="mt-4 text-[11px] font-black">
                      No recovery actions yet
                    </div>

                    <div className="mt-1 text-[10px] text-black/40">
                      Recovery activity will appear here once
                      RECOVR executes an action.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 md:p-7">
                  <div className="relative">
                    <div className="absolute bottom-4 left-[17px] top-4 w-px bg-black/15" />

                    <div className="space-y-6">
                      {events.map((event, index) => (
                        <div
                          key={event.id}
                          className="relative flex gap-4"
                        >
                          <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-[9px] font-black">
                            {index + 1}
                          </div>

                          <div className="flex-1 rounded-2xl border border-black/15 bg-[#f5f5f0] p-5">
                            <div className="flex flex-col justify-between gap-3 md:flex-row">
                              <div>
                                <div className="text-[12px] font-black">
                                  {formatEventType(
                                    event.eventType
                                  )}
                                </div>

                                {event.action && (
                                  <div className="mt-2 inline-flex rounded-full bg-[#eeedff] px-2.5 py-1 text-[8px] font-black text-[#5f5cff]">
                                    {event.action}
                                  </div>
                                )}
                              </div>

                              <div className="text-[9px] font-semibold text-black/40">
                                {formatDate(
                                  event.createdAt
                                )}
                              </div>
                            </div>

                            <p className="mt-4 text-[10px] leading-5 text-black/55">
                              {event.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* CONTROL */}
            <section className="rounded-[28px] border-2 border-black bg-white p-6 md:p-7">
              <div className="text-[9px] font-black tracking-[0.2em] text-[#5f5cff]">
                RECOVERY CONTROL
              </div>

              <h2 className="mt-2 text-[26px] font-black tracking-[-0.055em]">
                Take action
              </h2>

              <p className="mt-2 text-[10px] leading-5 text-black/45">
                Execute only the recovery strategy recommended
                by the decision engine.
              </p>

              <div className="mt-6 space-y-3">
                {canExecuteAction &&
                  item.recommendation === "RETRY" && (
                    <button
                      onClick={() =>
                        void executeRecoveryAction("RETRY")
                      }
                      disabled={actionLoading}
                      className="group w-full rounded-2xl bg-[#5f5cff] px-5 py-4 text-left text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-black">
                            {actionLoading
                              ? "EXECUTING..."
                              : "EXECUTE CONTROLLED RETRY"}
                          </div>

                          <div className="mt-1 text-[9px] text-white/60">
                            Retry the failed payment.
                          </div>
                        </div>

                        <span className="text-lg transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </button>
                  )}

                {canExecuteAction &&
                  item.recommendation === "PAYMENT_LINK" && (
                    <button
                      onClick={() =>
                        void executeRecoveryAction(
                          "PAYMENT_LINK"
                        )
                      }
                      disabled={actionLoading}
                      className="group w-full rounded-2xl bg-[#5f5cff] px-5 py-4 text-left text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-black">
                            {actionLoading
                              ? "GENERATING..."
                              : "GENERATE PAYMENT LINK"}
                          </div>

                          <div className="mt-1 text-[9px] text-white/60">
                            Give the customer another way to pay.
                          </div>
                        </div>

                        <span className="text-lg transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </button>
                  )}

                {outcomePending && (
                  <button
                    onClick={() =>
                      void evaluateOutcome()
                    }
                    disabled={actionLoading}
                    className="w-full rounded-2xl bg-black px-5 py-4 text-left text-white transition hover:bg-[#5f5cff] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-black">
                          {actionLoading
                            ? "EVALUATING..."
                            : "EVALUATE RECOVERY OUTCOME"}
                        </div>

                        <div className="mt-1 text-[9px] text-white/40">
                          Check whether the recovery action worked.
                        </div>
                      </div>

                      <span className="text-lg">→</span>
                    </div>
                  </button>
                )}

                {isRecovered && (
                  <div className="rounded-2xl border-2 border-[#177245] bg-[#eaf8ef] p-5">
                    <div className="flex items-center gap-2 text-[9px] font-black tracking-[0.15em] text-[#177245]">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#177245] text-white">
                        ✓
                      </span>

                      RECOVERY COMPLETE
                    </div>

                    <div className="mt-4 text-[30px] font-black tracking-[-0.05em] text-[#177245]">
                      {formatINR(
                        item.recoveredAmount ?? item.amount
                      )}
                    </div>

                    <p className="mt-2 text-[10px] leading-5 text-[#177245]/70">
                      Revenue successfully recovered.
                    </p>
                  </div>
                )}

                {outcomeFailed && (
                  <div className="rounded-2xl border-2 border-[#b42318] bg-[#fff0f0] p-5">
                    <div className="text-[9px] font-black tracking-[0.15em] text-[#b42318]">
                      RECOVERY UNSUCCESSFUL
                    </div>

                    <div className="mt-3 text-[28px] font-black tracking-[-0.05em] text-[#b42318]">
                      {formatINR(item.amount)}
                    </div>

                    <p className="mt-2 text-[10px] leading-5 text-[#b42318]/70">
                      The executed recovery strategy did not
                      recover this payment. RECOVR marked the
                      case for review.
                    </p>
                  </div>
                )}

                {!isRecovered &&
                  actionAlreadyExecuted &&
                  !outcomeFailed && (
                    <div className="rounded-2xl border-2 border-[#bcbaff] bg-[#eeedff] p-5">
                      <div className="text-[9px] font-black tracking-[0.15em] text-[#5f5cff]">
                        RECOVERY EXECUTED
                      </div>

                      <p className="mt-3 text-[10px] leading-5 text-black/55">
                        A recovery action has been executed.
                        Evaluate the outcome to determine whether
                        revenue was recovered.
                      </p>
                    </div>
                  )}

                {!item.recoverable && (
                  <div className="rounded-2xl border-2 border-black bg-[#f5f5f0] p-5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[9px] font-black text-white">
                        ✓
                      </span>

                      <div className="text-[9px] font-black tracking-[0.15em]">
                        NO RECOVERY REQUIRED
                      </div>
                    </div>

                    <p className="mt-3 text-[10px] leading-5 text-black/45">
                      This transaction is not eligible for
                      recovery.
                    </p>
                  </div>
                )}

                {item.recoverable &&
                  !isRecovered &&
                  item.shouldRecover === false &&
                  !outcomeFailed &&
                  !actionAlreadyExecuted && (
                    <div className="rounded-2xl border-2 border-black bg-[#fff4df] p-5">
                      <div className="text-[9px] font-black tracking-[0.15em] text-[#925f00]">
                        MANUAL REVIEW REQUIRED
                      </div>

                      <p className="mt-3 text-[10px] leading-5 text-[#925f00]/70">
                        RECOVR has blocked autonomous execution
                        for this transaction.
                      </p>
                    </div>
                  )}

                {isNoAction &&
                  item.recoverable &&
                  !isRecovered &&
                  !actionAlreadyExecuted && (
                    <div className="rounded-2xl border-2 border-black bg-[#f5f5f0] p-5">
                      <div className="text-[9px] font-black tracking-[0.15em]">
                        DECISION: NO ACTION
                      </div>

                      <p className="mt-3 text-[10px] leading-5 text-black/45">
                        RECOVR determined that this transaction
                        does not require an automated recovery
                        action.
                      </p>
                    </div>
                  )}
              </div>
            </section>

            {/* DECISION SNAPSHOT */}
            <section className="rounded-[28px] border-2 border-black bg-[#5f5cff] p-6 text-white md:p-7">
              <div className="text-[9px] font-black tracking-[0.2em] text-white/55">
                DECISION SNAPSHOT
              </div>

              <div className="mt-4 text-[28px] font-black tracking-[-0.055em]">
                {formatRecommendation(
                  item.recommendation
                )}
              </div>

              <div className="mt-6 h-px bg-white/20" />

              <div className="mt-5 flex items-end justify-between">
                <div>
                  <div className="text-[8px] font-black tracking-[0.14em] text-white/50">
                    CONFIDENCE
                  </div>

                  <div className="mt-1 text-[24px] font-black">
                    {item.confidence}%
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[8px] font-black tracking-[0.14em] text-white/50">
                    PRIORITY
                  </div>

                  <div className="mt-1 text-[12px] font-black uppercase">
                    {item.priority ?? "—"}
                  </div>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width: `${Math.min(
                      Math.max(item.confidence, 0),
                      100
                    )}%`,
                  }}
                />
              </div>
            </section>

            {/* METADATA */}
            <section className="rounded-[28px] border-2 border-black bg-white p-6 md:p-7">
              <div className="text-[9px] font-black tracking-[0.2em] text-[#5f5cff]">
                CASE METADATA
              </div>

              <div className="mt-6 divide-y divide-black/10">
                <MetaRow
                  label="CASE ID"
                  value={item.id}
                />

                <MetaRow
                  label="RECOVERY ACTION"
                  value={
                    item.recoveryAction ??
                    "Not executed"
                  }
                />

                <MetaRow
                  label="RECOVERY STATUS"
                  value={formatStatus(
                    item.recoveryStatus
                  )}
                />

                <MetaRow
                  label="LAST UPDATED"
                  value={formatDate(
                    item.updatedAt
                  )}
                />

                {item.recoveredAt && (
                  <MetaRow
                    label="RECOVERED AT"
                    value={formatDate(
                      item.recoveredAt
                    )}
                  />
                )}
              </div>
            </section>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="mt-12 border-t-2 border-black pt-6">
          <div className="flex flex-col justify-between gap-3 text-[9px] font-bold text-black/40 md:flex-row">
            <span>
              RECOVR · REVENUE RECOVERY CONTROL TOWER
            </span>

            <span>
              RECOVERY ENGINE · RAZORPAY TEST MODE · DEMO
              ENVIRONMENT
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* =========================================================
   UI COMPONENTS
========================================================= */

function MetricCard({
  label,
  value,
  subtext,
  accent = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border-2 border-black p-5 ${
        accent
          ? "bg-black text-white"
          : "bg-white text-black"
      }`}
    >
      <div
        className={`text-[9px] font-black tracking-[0.17em] ${
          accent
            ? "text-white/40"
            : "text-black/40"
        }`}
      >
        {label}
      </div>

      <div
        className={`mt-4 break-words text-[27px] font-black tracking-[-0.055em] ${
          accent ? "text-white" : "text-black"
        }`}
      >
        {value}
      </div>

      {subtext && (
        <div
          className={`mt-2 text-[8px] font-black tracking-[0.1em] ${
            accent
              ? "text-[#a7a5ff]"
              : "text-[#5f5cff]"
          }`}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}

function InfoBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="border-b border-black/15 p-6 md:p-7">
      <div className="flex items-center justify-between">
        <div className="text-[9px] font-black tracking-[0.16em] text-black/40">
          {label}
        </div>

        <div className="text-[8px] font-black text-[#5f5cff]">
          {icon}
        </div>
      </div>

      <div className="mt-3 break-words text-[12px] font-black leading-5">
        {value}
      </div>
    </div>
  );
}

function DarkMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="text-[8px] font-black tracking-[0.15em] text-white/35">
        {label}
      </div>

      <div className="mt-2 text-[11px] font-black text-white">
        {value}
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="text-[8px] font-black tracking-[0.15em] text-black/35">
        {label}
      </div>

      <div className="mt-1 break-all text-[10px] font-bold">
        {value}
      </div>
    </div>
  );
}