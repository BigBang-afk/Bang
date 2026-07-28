export function StatCard({ label, value, sub, tone = "neutral" }: { label: string; value: string | number; sub?: string; tone?: "up" | "down" | "gold" | "neutral" }) {
  const toneClass = { up: "text-signal-up", down: "text-signal-down", gold: "text-gold-400", neutral: "text-cyan-400" }[tone];
  return (
    <div className="glass-card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
