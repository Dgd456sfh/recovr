import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  negative?: boolean;
};

export default function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  negative = false,
}: MetricCardProps) {
  return (
    <div className="rounded-[20px] border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-[0.15em] text-black/35">
          {label}
        </span>

        <Icon size={15} className="text-black/30" />
      </div>

      <div className="mt-5 text-[31px] font-black tracking-[-0.05em]">
        {value}
      </div>

      <div
        className={`mt-2 text-[9px] font-bold ${
          negative ? "text-[#d95d5d]" : "text-[#177245]"
        }`}
      >
        {change}
      </div>
    </div>
  );
}