export function StatCard({
  label,
  value,
  accent = "text-white",
  sublabel,
}: {
  label: string;
  value: string;
  accent?: string;
  sublabel?: string;
}) {
  return (
    <div className="card">
      <div className="label-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent}`}>{value}</div>
      {sublabel && <div className="text-xs text-gray-500 mt-1">{sublabel}</div>}
    </div>
  );
}
