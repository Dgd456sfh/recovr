export default function PolicyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 py-4">
      <span className="text-[10px] text-white/40">{label}</span>

      <span className="text-[11px] font-bold">{value}</span>
    </div>
  );
}