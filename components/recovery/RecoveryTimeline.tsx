"use client";

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
  recoveryStatus: string;
  recoveryAction: string | null;
  recommendation: string;
  confidence: number;
  reason: string;
  priority: string;
  recovered: boolean;
  recoveredAmount: number | null;
  recoveryEvents: RecoveryEvent[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RecoveryTimeline({
  item,
  onClose,
}: {
  item: RecoveryCase | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-black bg-[#f7f7f4] p-6 shadow-[8px_8px_0px_#000]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5f5cff]">
              Recovery case
            </p>

            <h2 className="mt-2 text-2xl font-black">
              {item.customerEmail}
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {item.paymentId}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-black bg-white px-4 py-2 text-sm font-bold hover:bg-black hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-black bg-white p-4">
            <p className="text-xs text-neutral-500">
              Amount
            </p>
            <p className="mt-1 text-xl font-black">
              {money(item.amount, item.currency)}
            </p>
          </div>

          <div className="rounded-2xl border border-black bg-white p-4">
            <p className="text-xs text-neutral-500">
              Confidence
            </p>
            <p className="mt-1 text-xl font-black">
              {item.confidence}%
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
            RECOVR decision
          </p>

          <p className="mt-2 text-lg font-black">
            {item.recoveryAction
              ? item.recoveryAction.replaceAll("_", " ")
              : "NO ACTION"}
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {item.reason}
          </p>
        </div>

        <div className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5f5cff]">
            Event timeline
          </p>

          <div className="mt-5 space-y-5">
            {item.recoveryEvents.length === 0 ? (
              <div className="rounded-2xl border border-black bg-white p-5 text-sm text-neutral-500">
                No recovery events recorded yet.
              </div>
            ) : (
              [...item.recoveryEvents]
                .reverse()
                .map((event) => (
                  <div
                    key={event.id}
                    className="relative border-l-2 border-black pl-6"
                  >
                    <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border border-black bg-[#5f5cff]" />

                    <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                      {event.eventType.replaceAll("_", " ")}
                    </p>

                    {event.action && (
                      <p className="mt-1 text-sm font-black">
                        {event.action.replaceAll("_", " ")}
                      </p>
                    )}

                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {event.message.replace("â¹¹", "₹")}
                    </p>

                    <p className="mt-2 text-xs text-neutral-400">
                      {formatDate(event.createdAt)}
                    </p>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}