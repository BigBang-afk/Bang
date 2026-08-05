import clsx from "clsx";

export function ConfidenceGauge({ score }: { score: number }) {
  const color = score >= 75 ? "bg-accent-buy" : score >= 55 ? "bg-accent-warn" : "bg-accent-sell";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-base-700 overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-mono w-10 text-right">{Math.round(score)}%</span>
    </div>
  );
}
