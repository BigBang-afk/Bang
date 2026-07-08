"use client";

import { Direction, SignalStrength } from "@/lib/types";

const STRENGTH_COLOR: Record<SignalStrength, string> = {
  Strong: "bg-emerald-400",
  Good: "bg-lime-400",
  Normal: "bg-amber-400",
  Risky: "bg-orange-500",
};

export function ConfidenceMeter({
  confidence,
  strength,
  direction,
}: {
  confidence: number;
  strength: SignalStrength;
  direction: Direction;
}) {
  const barColor = direction === "CALL" ? "bg-call" : "bg-put";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Confidence</span>
        <span className="flex items-center gap-1.5 font-semibold text-white">
          <span className={`h-1.5 w-1.5 rounded-full ${STRENGTH_COLOR[strength]}`} />
          {strength} · {confidence}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-border">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
}
