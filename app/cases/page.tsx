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
  recovered?: boolean;
  recoveredAmount?: number | null;
  recoveredAt?: string | null;
  recoveryStatus: string;
  recoveryAction?: string | null;
  recommendation: string;
  confidence: number;
  reason: string;
  priority?: string;
  shouldRecover?: boolean;
  createdAt: string;
  updatedAt: string;
};

type RecoveryResponse = {
  success: boolean;
  summary: {
    totalTransactions: number;
    activeRecoveryCases?: number;
    recoverableCases?: number;
    reviewRequired?: number;
    recoveredCases?: number;
    revenueAtRisk: number;
    recoveredAmount?: number;
    recoveryRate?: number;
    currency: string;
  };
  cases: RecoveryCase[];
};

export default function CasesPage() {
  const [data, setData] = useState<RecoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadCases();
  }, []);

  async function loadCases() {
    try {
      setLoading(true);

      const response = await fetch("/api/recovery", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load recovery cases");
      }

      const result = (await response.json()) as RecoveryResponse;

      setData(result);
    } catch (error) {
      console.error("Cases error:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const cases = data?.cases ?? [];

  const activeCases = cases.filter((item) => {
    return (
      item.recoverable &&
      !item.recovered &&
      item.status !== "RECOVERED" &&
      item.recoveryStatus !== "RECOVERED"
    );
  });

  const revenueAtRisk = activeCases.reduce(
    (total, item) => total + item.amount,
    0
  );

  const totalTransactions =
    data?.summary.totalTransactions ?? cases.length;

  function formatINR(amount: number) {
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  function formatStatus(status: string) {
    switch (status) {
      case "PAYMENT_LINK_GENERATED":
        return "Payment Link Generated";

      case "RETRY_SCHEDULED":
        return "Retry Scheduled";

      case "RECOVERED":
        return "Recovered";

      case "NOT_REQUIRED":
        return "No Action";

      case "PENDING":
        return "Pending";

      default:
        return status.replaceAll("_", " ");
    }
  }

  function getRecommendationLabel(recommendation: string) {
    switch (recommendation) {
      case "RETRY":
        return "Retry Payment";

      case "PAYMENT_LINK":
        return "Payment Link";

      case "REVIEW":
        return "Manual Review";

      case "NO_ACTION":
        return "No Action";

      default:
        return recommendation.replaceAll("_", " ");
    }
  }

  function getStatusClasses(item: RecoveryCase) {
    const isRecovered =
      item.recovered ||
      item.status === "RECOVERED" ||
      item.recoveryStatus === "RECOVERED";

    if (isRecovered) {
      return "border-[#177245]/20 bg-[#eaf8ef] text-[#177245]";
    }

    if (item.recoveryStatus === "PENDING") {
      return "border-[#9a6500]/20 bg-[#fff4df] text-[#9a6500]";
    }

    if (
      item.recoveryStatus === "PAYMENT_LINK_GENERATED" ||
      item.recoveryStatus === "RETRY_SCHEDULED"
    ) {
      return "border-[#5f5cff]/20 bg-[#eeeeff] text-[#5f5cff]";
    }

    return "border-black/10 bg-black/[0.04] text-black";
  }

  return (
    <main className="min-h-screen bg-[#e9e9e4] text-black">

      {/* =========================================================
          HEADER
      ========================================================= */}

      <header className="border-b border-black/15 bg-[#e9e9e4]">

        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between px-5 md:px-8">

          {/* LOGO */}

          <a
            href="/"
            className="text-[21px] font-black tracking-[-0.09em]"
          >
            RECO
            <span className="text-[#5f5cff]">
              VR
            </span>
          </a>

          {/* NAVIGATION */}

          <nav className="hidden items-center gap-8 text-[11px] font-bold md:flex">

            <a
              href="/dashboard"
              className="text-black/45 transition hover:text-black"
            >
              Overview
            </a>

            <span className="relative text-black">
              Cases

              <span className="absolute -bottom-[27px] left-0 h-[2px] w-full bg-[#5f5cff]" />
            </span>

            <a
              href="/analytics"
              className="text-black/45 transition hover:text-black"
            >
              Analytics
            </a>

            <a
              href="/audit"
              className="text-black/45 transition hover:text-black"
            >
              Audit Log
            </a>

          </nav>

          {/* MERCHANT */}

          <div className="flex items-center gap-3">

            <div className="hidden text-right md:block">

              <div className="text-[10px] font-black">
                Demo Merchant
              </div>

              <div className="mt-0.5 text-[9px] font-medium text-black/45">
                Razorpay Test Mode
              </div>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[10px] font-black text-white">
              DM
            </div>

          </div>

        </div>

      </header>

      {/* =========================================================
          MAIN
      ========================================================= */}

      <div className="mx-auto max-w-[1500px] px-5 py-9 md:px-8 md:py-12">

        {/* =======================================================
            HERO
        ======================================================= */}

        <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">

          <div>

            <div className="text-[9px] font-black tracking-[0.22em] text-[#5f5cff]">
              RECOVERY OPERATIONS
            </div>

            <h1 className="mt-3 text-[44px] font-black tracking-[-0.065em] md:text-[62px]">
              Recovery Cases
            </h1>

            <p className="mt-2 max-w-xl text-[12px] leading-5 text-black/55">
              Monitor payment failures, recovery decisions and
              revenue currently at risk.
            </p>

          </div>

          <button
            type="button"
            onClick={() => void loadCases()}
            disabled={loading}
            className="w-fit rounded-xl bg-black px-5 py-3 text-[10px] font-black text-white transition hover:bg-[#5f5cff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Cases"}
          </button>

        </section>

        {/* =======================================================
            SUMMARY
        ======================================================= */}

        <section className="mt-10 grid gap-4 sm:grid-cols-3">

          <SummaryCard
            label="TOTAL TRANSACTIONS"
            value={
              loading
                ? "—"
                : String(totalTransactions)
            }
          />

          <SummaryCard
            label="ACTIVE RECOVERY CASES"
            value={
              loading
                ? "—"
                : String(activeCases.length)
            }
            accent
          />

          <SummaryCard
            label="REVENUE AT RISK"
            value={
              loading
                ? "—"
                : formatINR(revenueAtRisk)
            }
          />

        </section>

        {/* =======================================================
            STATUS PILLS
        ======================================================= */}

        {!loading && data && (

          <div className="mt-5 flex flex-wrap gap-2">

            <div className="rounded-full border border-black/15 bg-white px-4 py-2 text-[9px] font-bold">
              <span className="mr-1 text-[#5f5cff]">
                {activeCases.length}
              </span>
              active
            </div>

            <div className="rounded-full border border-black/15 bg-white px-4 py-2 text-[9px] font-bold">
              <span className="mr-1">
                {data.summary.recoveredCases ?? 0}
              </span>
              recovered
            </div>

            <div className="rounded-full border border-black/15 bg-white px-4 py-2 text-[9px] font-bold">
              <span className="mr-1">
                {data.summary.reviewRequired ?? 0}
              </span>
              review required
            </div>

            <div className="rounded-full border border-black/15 bg-white px-4 py-2 text-[9px] font-bold">
              {data.summary.currency}
            </div>

          </div>

        )}

        {/* =======================================================
            CASE QUEUE
        ======================================================= */}

        <section className="mt-7">

          {/* QUEUE HEADER */}

          <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <div className="text-[9px] font-black tracking-[0.18em] text-black/40">
                RECOVERY QUEUE
              </div>

              <h2 className="mt-2 text-[24px] font-black tracking-[-0.04em]">
                All cases
              </h2>

              <p className="mt-1 text-[10px] text-black/45">
                {activeCases.length} active recovery{" "}
                {activeCases.length === 1
                  ? "opportunity"
                  : "opportunities"}
              </p>

            </div>

            <div className="rounded-xl border border-black/15 bg-white px-4 py-3">

              <span className="text-[9px] font-semibold text-black/45">
                Revenue currently at risk
              </span>

              <span className="ml-2 text-[11px] font-black">
                {loading
                  ? "—"
                  : formatINR(revenueAtRisk)}
              </span>

            </div>

          </div>

          {/* =====================================================
              LOADING
          ===================================================== */}

          {loading && (

            <div className="rounded-[24px] border border-black/15 bg-white p-14 text-center">

              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-[#5f5cff]" />

              <div className="mt-4 text-[11px] font-bold">
                Loading recovery cases...
              </div>

              <div className="mt-1 text-[9px] text-black/40">
                Analyzing payment recovery activity
              </div>

            </div>

          )}

          {/* =====================================================
              ERROR
          ===================================================== */}

          {!loading && !data && (

            <div className="rounded-[24px] border border-black/15 bg-white p-14 text-center">

              <div className="text-[13px] font-black">
                Unable to load recovery cases
              </div>

              <p className="mt-2 text-[10px] text-black/45">
                The recovery engine did not return case data.
              </p>

              <button
                type="button"
                onClick={() => void loadCases()}
                className="mt-5 rounded-xl bg-black px-5 py-3 text-[10px] font-black text-white transition hover:bg-[#5f5cff]"
              >
                Try Again
              </button>

            </div>

          )}

          {/* =====================================================
              EMPTY
          ===================================================== */}

          {!loading && data && cases.length === 0 && (

            <div className="rounded-[24px] border border-black/15 bg-white p-14 text-center">

              <div className="text-[13px] font-black">
                No recovery cases found
              </div>

              <p className="mt-2 text-[10px] text-black/45">
                Payment recovery opportunities will appear here
                when transactions are analyzed.
              </p>

            </div>

          )}

          {/* =====================================================
              CASES
          ===================================================== */}

          {!loading && data && cases.length > 0 && (

            <div className="space-y-3">

              {cases.map((item) => {

                const isRecovered =
                  item.recovered ||
                  item.status === "RECOVERED" ||
                  item.recoveryStatus === "RECOVERED";

                const isActive =
                  item.recoverable &&
                  !isRecovered;

                return (

                  <article
                    key={item.id}
                    className="group rounded-[20px] border border-black/20 bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition duration-200 hover:-translate-y-[1px] hover:border-black/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)] md:p-6"
                  >

                    {/* TOP LINE */}

                    <div className="mb-5 flex flex-col justify-between gap-3 border-b border-black/10 pb-4 md:flex-row md:items-center">

                      <div className="flex items-center gap-3">

                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-[10px] font-black text-white">
                          ₹
                        </div>

                        <div>

                          <div className="text-[8px] font-black tracking-[0.15em] text-black/35">
                            PAYMENT
                          </div>

                          <div className="mt-0.5 text-[12px] font-black">
                            {item.paymentId}
                          </div>

                        </div>

                        {isActive && (

                          <div className="rounded-full border border-[#5f5cff]/20 bg-[#5f5cff]/10 px-3 py-1.5 text-[8px] font-black text-[#5f5cff]">
                            ACTIVE
                          </div>

                        )}

                      </div>

                      <div className="text-[9px] font-semibold text-black/35">
                        Case ID · {item.id}
                      </div>

                    </div>

                    {/* DATA GRID */}

                    <div className="grid gap-6 md:grid-cols-[1.35fr_.75fr_1fr_1fr_1fr_auto] md:items-center">

                      {/* CUSTOMER */}

                      <div>

                        <div className="text-[8px] font-black tracking-[0.15em] text-black/35">
                          CUSTOMER
                        </div>

                        <div className="mt-2 break-all text-[11px] font-bold">
                          {item.customerEmail}
                        </div>

                      </div>

                      {/* AMOUNT */}

                      <div>

                        <div className="text-[8px] font-black tracking-[0.15em] text-black/35">
                          AMOUNT
                        </div>

                        <div className="mt-2 text-[16px] font-black tracking-[-0.03em]">
                          {formatINR(item.amount)}
                        </div>

                      </div>

                      {/* DECISION */}

                      <div>

                        <div className="text-[8px] font-black tracking-[0.15em] text-black/35">
                          DECISION
                        </div>

                        <div className="mt-2 text-[11px] font-black">
                          {getRecommendationLabel(
                            item.recommendation
                          )}
                        </div>

                        <div className="mt-1 text-[9px] text-black/40">
                          {item.confidence > 0
                            ? `${item.confidence}% confidence`
                            : "Not applicable"}
                        </div>

                      </div>

                      {/* STATUS */}

                      <div>

                        <div className="text-[8px] font-black tracking-[0.15em] text-black/35">
                          STATUS
                        </div>

                        <div
                          className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-[8px] font-black ${getStatusClasses(
                            item
                          )}`}
                        >
                          {formatStatus(
                            item.recoveryStatus
                          )}
                        </div>

                      </div>

                      {/* REASON */}

                      <div>

                        <div className="text-[8px] font-black tracking-[0.15em] text-black/35">
                          REASON
                        </div>

                        <div className="mt-2 line-clamp-2 text-[9px] font-semibold leading-4 text-black/55">
                          {item.reason ||
                            item.failureReason ||
                            "No failure reason available"}
                        </div>

                      </div>

                      {/* BUTTON */}

                      <a
                        href={`/cases/${item.id}`}
                        className="flex items-center justify-center rounded-xl bg-black px-4 py-3 text-[9px] font-black text-white transition hover:bg-[#5f5cff]"
                      >
                        View Case
                      </a>

                    </div>

                    {/* BOTTOM INFO */}

                    <div className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-4 md:flex-row md:items-center md:justify-between">

                      <div className="flex flex-wrap gap-2">

                        {item.priority && (

                          <span className="rounded-full bg-[#e9e9e4] px-3 py-1.5 text-[8px] font-black">
                            Priority · {item.priority}
                          </span>

                        )}

                        <span className="rounded-full bg-[#e9e9e4] px-3 py-1.5 text-[8px] font-bold text-black/55">
                          Recoverable ·{" "}
                          {item.recoverable
                            ? "Yes"
                            : "No"}
                        </span>

                      </div>

                      {item.recoveryAction && (

                        <div className="text-[9px] text-black/40">
                          Action:{" "}
                          <span className="font-black text-black">
                            {item.recoveryAction}
                          </span>
                        </div>

                      )}

                    </div>

                  </article>

                );
              })}

            </div>

          )}

        </section>

        {/* =======================================================
            INSIGHT SECTION
        ======================================================= */}

        {!loading && data && (

          <section className="mt-7 grid gap-4 lg:grid-cols-2">

            {/* RECOVERY STATE */}

            <div className="rounded-[24px] border border-black/20 bg-white p-7">

              <div className="text-[9px] font-black tracking-[0.18em] text-black/35">
                RECOVERY STATE
              </div>

              <h3 className="mt-3 text-[25px] font-black tracking-[-0.045em]">
                {activeCases.length > 0
                  ? "Recovery action required"
                  : "No active recovery required"}
              </h3>

              <p className="mt-3 max-w-xl text-[11px] leading-5 text-black/50">

                {activeCases.length > 0
                  ? `${activeCases.length} payment${
                      activeCases.length > 1
                        ? "s are"
                        : " is"
                    } currently eligible for recovery. Total revenue at risk is ${formatINR(
                      revenueAtRisk
                    )}.`
                  : "All currently recoverable transactions have already been recovered or do not require intervention."}

              </p>

            </div>

            {/* ENGINE */}

            <div className="rounded-[24px] bg-black p-7 text-white">

              <div className="text-[9px] font-black tracking-[0.18em] text-white/35">
                RECOVERY ENGINE
              </div>

              <h3 className="mt-3 text-[25px] font-black tracking-[-0.045em]">
                System operational
              </h3>

              <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] p-4">

                <div className="flex items-center gap-3">

                  <span className="h-2.5 w-2.5 rounded-full bg-[#5f5cff]" />

                  <span className="text-[10px] font-black">
                    Recovery engine online
                  </span>

                </div>

                <span className="text-[9px] text-white/35">
                  {totalTransactions} transactions analyzed
                </span>

              </div>

            </div>

          </section>

        )}

        {/* =======================================================
            FOOTER
        ======================================================= */}

        <footer className="mt-12 flex flex-col gap-2 border-t border-black/15 pt-6 text-[9px] font-medium text-black/40 md:flex-row md:justify-between">

          <span>
            RECOVR · Revenue Recovery Control Tower
          </span>

          <span>
            Recovery Engine · Demo Environment
          </span>

        </footer>

      </div>

    </main>
  );
}

/* ===============================================================
   SUMMARY CARD
================================================================ */

function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (

    <div
      className={`rounded-[20px] border bg-white p-6 transition hover:-translate-y-[1px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] ${
        accent
          ? "border-[#5f5cff]/30"
          : "border-black/20"
      }`}
    >

      <div className="flex items-center justify-between">

        <div className="text-[9px] font-black tracking-[0.16em] text-black/40">
          {label}
        </div>

        {accent && (
          <span className="h-2 w-2 rounded-full bg-[#5f5cff]" />
        )}

      </div>

      <div className="mt-5 text-[31px] font-black tracking-[-0.055em]">
        {value}
      </div>

    </div>

  );
}