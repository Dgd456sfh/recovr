"use client";

import { useEffect, useState } from "react";
import RecoveryStats from "./RecoveryStats";
import RecoveryCases from "./RecoveryCases";
import RecoveryTimeline from "./RecoveryTimeline";

type RecoveryEvent = {
  id: string;
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
  recoveredAmount: number | null;
  recoveredAt?: string | null;
  recoveryStatus: string;
  recoveryAction: string | null;
  recommendation: string;
  confidence: number;
  reason: string;
  priority: string;
  shouldRecover: boolean;
  recoveryEvents: RecoveryEvent[];
  createdAt: string;
  updatedAt: string;
};

type Summary = {
  totalTransactions: number;
  activeRecoveryCases: number;
  reviewRequired: number;
  recoveredCases: number;
  revenueAtRisk: number;
  recoveredAmount: number;
  recoveryRate: number;
  currency: string;
};

type RecoveryResponse = {
  success: boolean;
  summary: Summary;
  cases: RecoveryCase[];
};

export default function RecoveryOverview() {
  const [data, setData] =
    useState<RecoveryResponse | null>(null);

  const [selectedCase, setSelectedCase] =
    useState<RecoveryCase | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRecovery() {
    try {
      setError("");

      const response = await fetch("/api/recovery", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Recovery API returned ${response.status}`
        );
      }

      const result =
        (await response.json()) as RecoveryResponse;

      if (!result.success) {
        throw new Error("Recovery API returned an error");
      }

      setData(result);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load recovery data. Check that the RECOVR backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecovery();

    const interval = setInterval(loadRecovery, 15000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f4] p-6 md:p-10">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-6 w-24 rounded bg-neutral-200" />
          <div className="mt-4 h-14 w-96 rounded bg-neutral-200" />

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-36 rounded-3xl bg-neutral-200"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f7f7f4] p-6 md:p-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-black bg-white p-8 shadow-[5px_5px_0px_#000]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5f5cff]">
            RECOVR
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Recovery Command Center
          </h1>

          <p className="mt-4 text-neutral-500">
            {error}
          </p>

          <button
            onClick={() => {
              setLoading(true);
              loadRecovery();
            }}
            className="mt-6 rounded-xl border border-black bg-black px-5 py-3 text-sm font-bold text-white hover:bg-[#5f5cff]"
          >
            Retry connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#f7f7f4] px-5 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[#5f5cff]" />

                <p className="text-xs font-black uppercase tracking-[0.25em]">
                  RECOVR / COMMAND CENTER
                </p>
              </div>

              <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-7xl">
                Revenue
                <br />
                Recovery.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-500 md:text-lg">
                Monitor payment failures, recovery actions,
                outcomes, and revenue exposure from one
                operational view.
              </p>
            </div>

            <div className="rounded-2xl border border-black bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                System status
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#5f5cff]" />

                <span className="text-sm font-black">
                  RECOVERY ENGINE ONLINE
                </span>
              </div>

              <p className="mt-1 text-xs text-neutral-400">
                Live data · refreshes every 15s
              </p>
            </div>
          </header>

          <div className="mt-10">
            <RecoveryStats summary={data.summary} />
          </div>

          <div className="mt-8 rounded-3xl border border-black bg-black p-6 text-white md:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
                  Recovery intelligence
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {data.summary.activeRecoveryCases} active
                  recovery opportunities
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                  RECOVR is continuously evaluating failed
                  transactions and selecting bounded recovery
                  actions.
                </p>
              </div>

              <div className="rounded-2xl bg-[#5f5cff] px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wider">
                  Total transactions
                </p>

                <p className="mt-1 text-3xl font-black">
                  {data.summary.totalTransactions}
                </p>
              </div>
            </div>
          </div>

          <RecoveryCases
            cases={data.cases}
            onSelect={setSelectedCase}
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-black bg-white p-6">
              <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                Recovery philosophy
              </p>

              <p className="mt-3 text-lg font-black">
                Recover first. Escalate only when needed.
              </p>
            </div>

            <div className="rounded-3xl border border-black bg-white p-6">
              <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                Execution
              </p>

              <p className="mt-3 text-lg font-black">
                Controlled, bounded recovery actions.
              </p>
            </div>

            <div className="rounded-3xl border border-black bg-white p-6">
              <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                Environment
              </p>

              <p className="mt-3 text-lg font-black">
                Simulation / test mode
              </p>
            </div>
          </div>
        </div>
      </main>

      <RecoveryTimeline
        item={selectedCase}
        onClose={() => setSelectedCase(null)}
      />
    </>
  );
}