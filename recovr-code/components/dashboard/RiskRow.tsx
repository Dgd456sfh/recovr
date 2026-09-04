export default function RiskRow({
  label,
  amount,
  percentage,
}: {
  label: string;
  amount: string;
  percentage: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/45">{label}</span>
        <span className="font-bold">{amount}</span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#9693ff]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}