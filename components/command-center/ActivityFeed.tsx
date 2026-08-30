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

type Props = {
  activity: {
    total: number;
    items: ActivityItem[];
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityFeed({ activity }: Props) {
  return (
    <div className="rounded-3xl border-2 border-black bg-black p-6 text-white md:p-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
            Operational timeline
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Recovery activity
          </h2>
        </div>

        <div className="rounded-full border-2 border-white/30 px-4 py-2 text-xs font-black text-white/70">
          {activity.total} EVENTS
        </div>
      </div>

      <div className="mt-7">
        {activity.items.map((item, index) => (
          <div
            key={item.id}
            className={`flex gap-4 py-5 ${
              index !== activity.items.length - 1
                ? "border-b border-white/10"
                : ""
            }`}
          >
            <div className="flex w-6 flex-shrink-0 justify-center">
              <div className="mt-1 h-3 w-3 rounded-full bg-[#5f5cff]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col justify-between gap-2 md:flex-row">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white/70">
                      {item.type}
                    </span>

                    <span className="text-xs font-black text-[#a5a3ff]">
                      {item.action}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-medium leading-6 text-white/70">
                    {item.message}
                  </p>
                </div>

                <div className="flex-shrink-0 md:text-right">
                  <p className="font-black">
                    {formatCurrency(item.amount)}
                  </p>

                  <p className="mt-1 text-xs font-bold text-white/35">
                    {formatTime(item.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
                <span>{item.paymentId}</span>
                <span>{item.customerEmail}</span>
              </div>
            </div>
          </div>
        ))}

        {activity.items.length === 0 && (
          <div className="rounded-2xl border border-white/10 p-8 text-center">
            <p className="font-bold text-white/40">
              No recovery activity yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}