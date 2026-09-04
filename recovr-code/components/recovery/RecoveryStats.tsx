"use client";

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

function money(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RecoveryStats({
  summary,
}: {
  summary: Summary;
}) {
  const stats = [
    {
      label: "Revenue at Risk",
      value: money(summary.revenueAtRisk, summary.currency),
      description: "Currently exposed",
    },
    {
      label: "Recovered Revenue",
      value: money(summary.recoveredAmount, summary.currency),
      description: `${summary.recoveredCases} recovered cases`,
    },
    {
      label: "Recovery Rate",
      value: `${summary.recoveryRate}%`,
      description: "Successful recovery",
    },
    {
      label: "Active Cases",
      value: summary.activeRecoveryCases.toString(),
      description: `${summary.reviewRequired} require review`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-3xl border border-black bg-white p-6 shadow-[4px_4px_0px_#000]"
        >
          <p className="text-sm font-medium text-neutral-500">
            {stat.label}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight">
            {stat.value}
          </p>

          <p className="mt-2 text-sm text-neutral-500">
            {stat.description}
          </p>
        </div>
      ))}
    </div>
  );
}