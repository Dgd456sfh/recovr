type Health = {
  status: string;
  anomalyDetected: boolean;
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  successRate: number;
  failureRate: number;
  reason: string;
};

type Props = {
  health: Health;
};

export default function SystemHealth({ health }: Props) {
  const degraded = health.status === "DEGRADED";

  return (
    <div className="rounded-3xl border-2 border-black bg-white p-6 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-black/45">
            System health
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Payment network
          </h2>
        </div>

        <div
          className={`rounded-full border-2 border-black px-4 py-2 text-xs font-black ${
            degraded
              ? "bg-[#5f5cff] text-white"
              : "bg-white text-black"
          }`}
        >
          {health.status}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-5xl font-black tracking-[-0.05em]">
              {health.failureRate}%
            </div>

            <p className="mt-1 text-sm font-bold text-black/50">
              failure rate
            </p>
          </div>

          {health.anomalyDetected && (
            <div className="rounded-2xl border-2 border-black bg-black px-4 py-3 text-right text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                Anomaly
              </p>
              <p className="mt-1 text-sm font-black">DETECTED</p>
            </div>
          )}
        </div>

        <div className="mt-6 h-4 overflow-hidden rounded-full border-2 border-black bg-white">
          <div
            className="h-full bg-[#5f5cff] transition-all"
            style={{
              width: `${Math.min(100, health.failureRate)}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border-2 border-black p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
            Events
          </p>
          <p className="mt-2 text-2xl font-black">
            {health.totalEvents}
          </p>
        </div>

        <div className="rounded-2xl border-2 border-black p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
            Success
          </p>
          <p className="mt-2 text-2xl font-black">
            {health.successfulEvents}
          </p>
        </div>

        <div className="rounded-2xl border-2 border-black p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
            Failed
          </p>
          <p className="mt-2 text-2xl font-black">
            {health.failedEvents}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-black p-4 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/40">
          Diagnosis
        </p>

        <p className="mt-2 text-sm font-medium leading-6 text-white/80">
          {health.reason}
        </p>
      </div>
    </div>
  );
}