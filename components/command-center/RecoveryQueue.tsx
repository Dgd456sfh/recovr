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
  recommendation: string;
  confidence: number;
  priority: string;
  reason: string;
  shouldRecover: boolean;
};

type Props = {
  queue: {
    total: number;
    actionable: number;
    items: RecoveryCase[];
  };
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function priorityClass(priority: string) {
  if (priority === "HIGH") {
    return "bg-black text-white";
  }

  if (priority === "MEDIUM") {
    return "bg-[#5f5cff] text-white";
  }

  return "bg-white text-black";
}

export default function RecoveryQueue({ queue }: Props) {
  return (
    <div className="rounded-3xl border-2 border-black bg-white p-6 md:p-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-black/45">
            Recovery orchestration
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Recovery queue
          </h2>

          <p className="mt-2 text-sm font-medium text-black/50">
            Cases evaluated by RECOVR's recovery engine.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="rounded-full border-2 border-black px-4 py-2 text-xs font-black">
            {queue.total} CASES
          </div>

          <div className="rounded-full border-2 border-black bg-[#5f5cff] px-4 py-2 text-xs font-black text-white">
            {queue.actionable} ACTIONABLE
          </div>
        </div>
      </div>

      <div className="mt-7 space-y-3">
        {queue.items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border-2 border-black p-4 transition hover:-translate-y-0.5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border-2 border-black px-3 py-1 text-[10px] font-black ${priorityClass(
                      item.priority
                    )}`}
                  >
                    {item.priority}
                  </span>

                  <span className="rounded-full border-2 border-black px-3 py-1 text-[10px] font-black">
                    {item.recoveryStatus}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="truncate font-black">
                    {item.customerEmail}
                  </p>

                  <p className="mt-1 text-xs font-bold text-black/45">
                    {item.paymentId}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:min-w-[360px]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
                    Amount
                  </p>

                  <p className="mt-1 font-black">
                    {formatCurrency(item.amount, item.currency)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
                    Action
                  </p>

                  <p className="mt-1 font-black">
                    {item.recoveryAction || item.recommendation}
                  </p>
                </div>
              </div>

              <div className="lg:w-[280px]">
                <p className="text-xs font-medium leading-5 text-black/55">
                  {item.reason}
                </p>
              </div>
            </div>

            {item.shouldRecover && (
              <div className="mt-4 border-t-2 border-black pt-3">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5f5cff]">
                  Action required · recovery eligible
                </span>
              </div>
            )}
          </div>
        ))}

        {queue.items.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-black/20 p-8 text-center">
            <p className="font-bold text-black/50">
              Recovery queue is empty.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}