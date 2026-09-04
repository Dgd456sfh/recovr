"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RecoveryCase = {
  id: string;
  transactionId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  recoveryStatus?: string;
  recoveryAction?: string;
  recommendation?: string;
  reason?: string;
  customerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CasesResponse = {
  success?: boolean;
  cases?: RecoveryCase[];
  summary?: {
    totalTransactions?: number;
    totalCases?: number;
    recoveredTransactions?: number;
    failedTransactions?: number;
    revenueAtRisk?: number;
    recoveredRevenue?: number;
  };
  error?: string;
};

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(status?: string) {
  const value = status?.toUpperCase();

  if (
    value === "RECOVERED" ||
    value === "SUCCESS" ||
    value === "RESOLVED"
  ) {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (
    value === "FAILED" ||
    value === "PERMANENT_FAILURE"
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (
    value === "RETRY_SCHEDULED" ||
    value === "PAYMENT_LINK_GENERATED" ||
    value === "IN_PROGRESS"
  ) {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }

  return "bg-yellow-50 text-yellow-700 border-yellow-200";
}

export default function CasesPage() {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [summary, setSummary] = useState<
    NonNullable<CasesResponse["summary"]>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCases() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/recovery/cases", {
        method: "GET",
        cache: "no-store",
      });

      const data: CasesResponse = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.error || "Failed to load recovery cases."
        );
      }

      const receivedCases = Array.isArray(data.cases)
        ? data.cases
        : [];

      setCases(receivedCases);

      /*
       * IMPORTANT:
       *
       * The previous error happened because the code did:
       *
       * data?.summary.totalTransactions
       *
       * Optional chaining only protected `data`.
       * It did NOT protect `summary`.
       *
       * We now safely normalize summary before using it.
       */
      setSummary(data.summary ?? {});
    } catch (err) {
      console.error("Cases page error:", err);

      setCases([]);
      setSummary({});

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load recovery cases."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, []);

  /*
   * SAFE SUMMARY VALUES
   */

  const totalTransactions =
    summary.totalTransactions ?? cases.length;

  const totalCases =
    summary.totalCases ?? cases.length;

  const recoveredTransactions =
    summary.recoveredTransactions ??
    cases.filter(
      (item) =>
        item.status?.toUpperCase() === "RECOVERED" ||
        item.recoveryStatus?.toUpperCase() === "RECOVERED"
    ).length;

  const failedTransactions =
    summary.failedTransactions ??
    cases.filter(
      (item) =>
        item.status?.toUpperCase() === "FAILED"
    ).length;

  const revenueAtRisk =
    summary.revenueAtRisk ??
    cases.reduce(
      (total, item) =>
        total + (Number(item.amount) || 0),
      0
    );

  const recoveredRevenue =
    summary.recoveredRevenue ??
    cases
      .filter(
        (item) =>
          item.status?.toUpperCase() === "RECOVERED" ||
          item.recoveryStatus?.toUpperCase() === "RECOVERED"
      )
      .reduce(
        (total, item) =>
          total + (Number(item.amount) || 0),
        0
      );

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-black">
      <div className="mx-auto max-w-[1500px] px-6 py-8 md:px-10 lg:px-12">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#5f5cff]" />

              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                RECOVR / Recovery Cases
              </span>
            </div>

            <h1 className="text-5xl font-black tracking-[-0.05em] md:text-6xl">
              Recovery Cases
            </h1>

            <p className="mt-3 max-w-2xl text-base text-gray-500">
              Monitor failed payment incidents, recovery actions,
              revenue at risk, and recovered transactions.
            </p>
          </div>

          <button
            onClick={loadCases}
            disabled={loading}
            className="rounded-xl border-2 border-black bg-white px-5 py-3 text-sm font-bold transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Cases"}
          </button>
        </div>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="mb-8 rounded-2xl border-2 border-red-200 bg-red-50 p-5">
            <div className="font-bold text-red-700">
              Unable to load recovery cases
            </div>

            <div className="mt-1 text-sm text-red-600">
              {error}
            </div>

            <button
              onClick={loadCases}
              className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
            >
              Try Again
            </button>
          </div>
        )}

        {/* =====================================================
            SUMMARY CARDS
        ===================================================== */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-2xl border border-black bg-white p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Transactions
            </div>

            <div className="mt-3 text-4xl font-black tracking-tight">
              {totalTransactions}
            </div>

            <div className="mt-2 text-sm text-gray-500">
              Total payment attempts
            </div>
          </div>

          <div className="rounded-2xl border border-black bg-white p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Cases
            </div>

            <div className="mt-3 text-4xl font-black tracking-tight">
              {totalCases}
            </div>

            <div className="mt-2 text-sm text-gray-500">
              Recovery incidents
            </div>
          </div>

          <div className="rounded-2xl border border-black bg-white p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Recovered
            </div>

            <div className="mt-3 text-4xl font-black tracking-tight text-green-600">
              {recoveredTransactions}
            </div>

            <div className="mt-2 text-sm text-gray-500">
              Successfully recovered
            </div>
          </div>

          <div className="rounded-2xl border border-black bg-white p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Revenue At Risk
            </div>

            <div className="mt-3 text-3xl font-black tracking-tight">
              {formatINR(revenueAtRisk)}
            </div>

            <div className="mt-2 text-sm text-gray-500">
              Potentially recoverable
            </div>
          </div>

          <div className="rounded-2xl border border-black bg-[#5f5cff] p-6 text-white">
            <div className="text-xs font-bold uppercase tracking-widest text-white/70">
              Recovered Revenue
            </div>

            <div className="mt-3 text-3xl font-black tracking-tight">
              {formatINR(recoveredRevenue)}
            </div>

            <div className="mt-2 text-sm text-white/70">
              Revenue successfully recovered
            </div>
          </div>
        </div>

        {/* =====================================================
            CASE TABLE
        ===================================================== */}

        <section className="mt-10 overflow-hidden rounded-2xl border border-black bg-white">

          <div className="flex flex-col gap-4 border-b border-black px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                Recovery Queue
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Active and historical payment recovery cases.
              </p>
            </div>

            <div className="rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {cases.length} cases
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-sm font-bold text-gray-400">
                Loading recovery cases...
              </div>
            </div>
          ) : cases.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#5f5cff] text-2xl text-white">
                ✓
              </div>

              <h3 className="text-xl font-black">
                No recovery cases
              </h3>

              <p className="mt-2 max-w-md text-sm text-gray-500">
                RECOVR currently has no payment recovery incidents
                to display.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">

                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Payment
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Amount
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Recovery Action
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Reason
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Created
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      View
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {cases.map((item) => {

                    const status =
                      item.recoveryStatus ||
                      item.status ||
                      "PENDING";

                    const action =
                      item.recoveryAction ||
                      item.recommendation ||
                      "NO_ACTION";

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 transition hover:bg-[#f7f7f5]"
                      >

                        {/* PAYMENT */}

                        <td className="px-6 py-5">
                          <div className="font-mono text-sm font-bold">
                            {item.paymentId ||
                              item.transactionId ||
                              item.id}
                          </div>

                          {item.customerEmail && (
                            <div className="mt-1 text-xs text-gray-400">
                              {item.customerEmail}
                            </div>
                          )}
                        </td>

                        {/* AMOUNT */}

                        <td className="px-6 py-5">
                          <div className="font-bold">
                            {formatINR(
                              Number(item.amount) || 0
                            )}
                          </div>

                          <div className="mt-1 text-xs uppercase text-gray-400">
                            {item.currency || "INR"}
                          </div>
                        </td>

                        {/* STATUS */}

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusClass(
                              status
                            )}`}
                          >
                            {status.replaceAll("_", " ")}
                          </span>
                        </td>

                        {/* ACTION */}

                        <td className="px-6 py-5">
                          <div className="text-sm font-bold">
                            {action.replaceAll("_", " ")}
                          </div>
                        </td>

                        {/* REASON */}

                        <td className="max-w-[280px] px-6 py-5">
                          <div className="truncate text-sm text-gray-500">
                            {item.reason || "No reason available"}
                          </div>
                        </td>

                        {/* DATE */}

                        <td className="px-6 py-5">
                          <div className="whitespace-nowrap text-sm text-gray-500">
                            {formatDate(item.createdAt)}
                          </div>
                        </td>

                        {/* VIEW */}

                        <td className="px-6 py-5">
                          <Link
                            href={`/cases/${item.id}`}
                            className="inline-flex rounded-lg border border-black px-3 py-2 text-xs font-bold transition hover:bg-black hover:text-white"
                          >
                            View Case
                          </Link>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          )}
        </section>

        {/* =====================================================
            FOOTER METRICS
        ===================================================== */}

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">

          <div className="rounded-2xl border border-black bg-white p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Failed Transactions
            </div>

            <div className="mt-2 text-3xl font-black">
              {failedTransactions}
            </div>

            <div className="mt-2 text-sm text-gray-500">
              Transactions requiring recovery attention.
            </div>
          </div>

          <div className="rounded-2xl border border-black bg-white p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Recovery Rate
            </div>

            <div className="mt-2 text-3xl font-black">
              {totalTransactions > 0
                ? `${Math.round(
                    (recoveredTransactions /
                      totalTransactions) *
                      100
                  )}%`
                : "0%"}
            </div>

            <div className="mt-2 text-sm text-gray-500">
              Successful recovery relative to total transactions.
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}