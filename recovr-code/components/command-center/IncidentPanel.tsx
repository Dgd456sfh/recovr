type Incident = {
  id: string;
  status: string;
  severity: string;
  type: string;
  detectedAt: string;
  channel: string;
  provider: string;
  failureCount: number;
  revenueAtRisk: number;
  recoverableRevenue: number;
  diagnosis: string;
  confidence: number;
  recommendedAction: string;
  guardrailStatus: string;
  recoveryStatus: string;
};

type Props = {
  incidents: {
    total: number;
    active: number;
    items: Incident[];
  };
  overview: {
    currency: string;
  };
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function IncidentPanel({
  incidents,
  overview,
}: Props) {
  const incident = incidents.items?.[0];

  return (
    <div className="rounded-3xl border-2 border-black bg-white p-6 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-black/45">
            Incident intelligence
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Active incidents
          </h2>
        </div>

        <div className="rounded-full border-2 border-black bg-[#5f5cff] px-4 py-2 text-xs font-black text-white">
          {incidents.active} ACTIVE
        </div>
      </div>

      {!incident ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-black/20 p-8 text-center">
          <p className="font-bold text-black/50">
            No active incidents detected.
          </p>
        </div>
      ) : (
        <div className="mt-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border-2 border-black bg-black px-3 py-1.5 text-xs font-black text-white">
              {incident.severity}
            </span>

            <span className="rounded-full border-2 border-black px-3 py-1.5 text-xs font-black">
              {incident.type}
            </span>

            <span className="rounded-full border-2 border-black px-3 py-1.5 text-xs font-black">
              {incident.status}
            </span>
          </div>

          <div className="mt-6">
            <h3 className="text-2xl font-black">
              {incident.provider}
            </h3>

            <p className="mt-1 text-sm font-bold text-black/50">
              {incident.channel} · {incident.failureCount} failures
            </p>
          </div>

          <p className="mt-5 text-sm font-medium leading-6 text-black/65">
            {incident.diagnosis}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border-2 border-black p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
                Revenue at risk
              </p>

              <p className="mt-2 text-xl font-black">
                {formatCurrency(
                  incident.revenueAtRisk,
                  overview.currency
                )}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-black p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
                Recoverable
              </p>

              <p className="mt-2 text-xl font-black">
                {formatCurrency(
                  incident.recoverableRevenue,
                  overview.currency
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f0efff] p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
                Recommended action
              </p>

              <p className="mt-1 font-black">
                {incident.recommendedAction}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
                Confidence
              </p>

              <p className="mt-1 font-black">
                {Math.round(incident.confidence * 100)}%
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-between border-t-2 border-black pt-4 text-xs font-bold uppercase tracking-wider text-black/50">
            <span>
              Guardrail: {incident.guardrailStatus}
            </span>

            <span>
              Recovery: {incident.recoveryStatus}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}