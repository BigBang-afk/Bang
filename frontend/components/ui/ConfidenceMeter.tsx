"use client";

export function ConfidenceMeter({ score }: { score: number }) {
  const color = score >= 80 ? "bg-bull" : score >= 60 ? "bg-gold" : "bg-bear";

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="label-muted">Confidence</span>
        <span className="font-semibold text-white">{score.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full bg-charcoal rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  );
}
