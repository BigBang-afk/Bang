"use client";

import type { SignalDirection } from "@/lib/analysis/types";

const STYLES: Record<SignalDirection, { bg: string; text: string; ring: string; label: string }> = {
  CALL: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    ring: "ring-emerald-500/40",
    label: "CALL / UP",
  },
  PUT: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    ring: "ring-red-500/40",
    label: "PUT / DOWN",
  },
  WAIT: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    ring: "ring-amber-500/40",
    label: "WAIT — NO CLEAR EDGE",
  },
};

export default function SignalCard({
  signal,
  confidence,
}: {
  signal: SignalDirection;
  confidence: number;
}) {
  const style = STYLES[signal];

  return (
    <div className={`rounded-2xl p-6 ring-1 ${style.bg} ${style.ring}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            1 min timeframe · 1 min expiry
          </p>
          <p className={`mt-1 text-3xl font-bold ${style.text}`}>{style.label}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Confidence</p>
          <p className={`text-4xl font-bold ${style.text}`}>{confidence}%</p>
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full ${style.text.replace("text-", "bg-")}`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      {signal === "WAIT" && (
        <p className="mt-3 text-xs text-slate-400">
          Signals are weak or conflicting on this scan — the honest read is to sit this one out rather than force a trade.
        </p>
      )}
    </div>
  );
}
