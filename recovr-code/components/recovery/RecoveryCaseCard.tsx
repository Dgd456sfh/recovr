"use client";

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

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function priorityClass(priority: string) {
  switch (priority) {
    case "HIGH":
      return "bg-black text-white";
    case "MEDIUM":
      return "bg-[#5f5cff] text-white";
    default:
      return "bg-neutral-100 text-black";
  }
}

function statusClass(status: string) {
  if (status === "RECOVERED") {
    return "bg-black text-white";
  }

  if (
    status === "RECOVERY_FAILED" ||
    status === "FAILED"
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (
    status === "RETRY_SCHEDULED" ||
    status === "EXECUTED"
  ) {
    return "bg-purple-50 text-[#5f5cff] border-purple-200";
  }

  if (status === "PAYMENT_LINK_GENERATED") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  return "bg-neutral-100 text-neutral-700 border-neutral-200";
}

export default function RecoveryCaseCard({
  item,
  onSelect,
}: {
  item: RecoveryCase;
  onSelect: (item: RecoveryCase) => void;
}) {
  const isFailed = item.status === "FAILED";

  return (
    <button
      onClick={() => onSelect(item)}
      className="group w-full rounded-3xl border border-black bg-white p-5 text-left transition hover:-translate-y-1 hover:shadow-[4px_4px_0px_#000]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-400">
            {item.paymentId}
          </p>

          <h3 className="mt-2 text-lg font-black">
            {item.customerEmail}
          </h3>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${priorityClass(
            item.priority
          )}`}
        >
          {item.priority}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-xs text-neutral-500">
            Amount at risk
          </p>

          <p className="mt-1 text-2xl font-black">
            {money(item.amount, item.currency)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-neutral-500">
            Confidence
          </p>

          <p className="mt-1 font-black">
            {item.confidence}%
          </p>
        </div>
      </div>

      {item.failureReason && (
        <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Failure
          </p>

          <p className="mt-1 text-sm font-semibold">
            {item.failureReason}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusClass(
            item.recoveryStatus
          )}`}
        >
          {item.recoveryStatus.replaceAll("_", " ")}
        </span>

        {item.recoveryAction && (
          <span className="rounded-full border border-black px-3 py-1 text-[11px] font-bold">
            {item.recoveryAction.replaceAll("_", " ")}
          </span>
        )}
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-neutral-500">
        {item.reason}
      </p>

      {isFailed && item.shouldRecover && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          Recovery attempt requires follow-up
        </div>
      )}
    </button>
  );
}