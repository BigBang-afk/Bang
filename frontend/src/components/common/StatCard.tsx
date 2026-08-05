import clsx from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: "neutral" | "positive" | "negative";
}

export function StatCard({ label, value, sublabel, tone = "neutral" }: StatCardProps) {
  return (
    <div className="stat-tile">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span
        className={clsx(
          "text-2xl font-semibold mono-num",
          tone === "positive" && "text-accent-buy",
          tone === "negative" && "text-accent-sell",
          tone === "neutral" && "text-slate-100"
        )}
      >
        {value}
      </span>
      {sublabel && <span className="text-xs text-slate-500">{sublabel}</span>}
    </div>
  );
}
