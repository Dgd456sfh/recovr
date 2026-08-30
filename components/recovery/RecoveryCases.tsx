"use client";

import RecoveryCaseCard from "./RecoveryCaseCard";

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
  recoveryStatus: string;
  recoveryAction: string | null;
  recommendation: string;
  confidence: number;
  reason: string;
  priority: string;
  shouldRecover: boolean;
  recoveryEvents: {
    id: string;
    eventType: string;
    action: string | null;
    message: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export default function RecoveryCases({
  cases,
  onSelect,
}: {
  cases: RecoveryCase[];
  onSelect: (item: RecoveryCase) => void;
}) {
  const activeCases = cases
    .filter(
      (item) =>
        item.status === "FAILED" ||
        item.recoverable ||
        item.recoveryStatus !== "NOT_REQUIRED"
    )
    .sort((a, b) => {
      const order: Record<string, number> = {
        HIGH: 0,
        MEDIUM: 1,
        LOW: 2,
      };

      return (
        (order[a.priority] ?? 99) -
        (order[b.priority] ?? 99)
      );
    });

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5f5cff]">
            Recovery queue
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight">
            Cases requiring attention
          </h2>
        </div>

        <span className="rounded-full border border-black bg-white px-4 py-2 text-sm font-bold">
          {activeCases.length} cases
        </span>
      </div>

      {activeCases.length === 0 ? (
        <div className="rounded-3xl border border-black bg-white p-10 text-center">
          <p className="text-xl font-black">
            No active recovery cases
          </p>

          <p className="mt-2 text-sm text-neutral-500">
            RECOVR currently has nothing requiring action.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {activeCases.map((item) => (
            <RecoveryCaseCard
              key={item.id}
              item={item}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}