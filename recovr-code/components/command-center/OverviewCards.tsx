type Overview = {
  activeIncidents: number;
  totalIncidents: number;
  revenueAtRisk: number;
  recoverableRevenue: number;
  recoveredRevenue: number;
  recoveredCases: number;
  activeRecoveryCases: number;
  recoveryRate: number;
  currency: string;
};

type Props = {
  overview: Overview;
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OverviewCards({ overview }: Props) {
  const cards = [
    {
      label: "Revenue at risk",
      value: formatCurrency(
        overview.revenueAtRisk,
        overview.currency
      ),
      detail: "Current exposure",
      highlight: true,
    },
    {
      label: "Recoverable revenue",
      value: formatCurrency(
        overview.recoverableRevenue,
        overview.currency
      ),
      detail: "Eligible recovery",
      highlight: false,
    },
    {
      label: "Recovered revenue",
      value: formatCurrency(
        overview.recoveredRevenue,
        overview.currency
      ),
      detail: `${overview.recoveredCases} recovered case${
        overview.recoveredCases === 1 ? "" : "s"
      }`,
      highlight: false,
    },
    {
      label: "Recovery rate",
      value: `${overview.recoveryRate}%`,
      detail: "Observed recovery",
      highlight: false,
    },
    {
      label: "Active cases",
      value: overview.activeRecoveryCases,
      detail: `${overview.activeIncidents} active incident${
        overview.activeIncidents === 1 ? "" : "s"
      }`,
      highlight: false,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`group rounded-3xl border-2 border-black p-5 transition duration-200 hover:-translate-y-1 ${
            card.highlight
              ? "bg-[#5f5cff] text-white"
              : "bg-white text-black"
          }`}
        >
          <div
            className={`text-xs font-black uppercase tracking-[0.15em] ${
              card.highlight ? "text-white/70" : "text-black/45"
            }`}
          >
            {card.label}
          </div>

          <div className="mt-6 break-words text-3xl font-black tracking-[-0.04em]">
            {card.value}
          </div>

          <div
            className={`mt-2 text-xs font-bold ${
              card.highlight ? "text-white/70" : "text-black/50"
            }`}
          >
            {card.detail}
          </div>
        </div>
      ))}
    </div>
  );
}