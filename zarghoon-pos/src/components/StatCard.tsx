import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  accent?: boolean;
}

export default function StatCard({ label, value, icon: Icon, hint, accent }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        accent
          ? "border-gold-700/50 bg-gradient-to-br from-gold-900/20 to-ink-900 shadow-[0_0_30px_-12px_rgba(212,175,55,0.4)]"
          : "border-gold-900/25 bg-ink-900/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
          {label}
        </span>
        <div
          className={`rounded-lg p-1.5 ${
            accent ? "bg-gold-500/15 text-gold-300" : "bg-ink-800 text-ink-500"
          }`}
        >
          <Icon size={16} strokeWidth={1.75} />
        </div>
      </div>
      <div className="mt-3 font-serif text-2xl font-semibold text-gold-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
    </div>
  );
}
