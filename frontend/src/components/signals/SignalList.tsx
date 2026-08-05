"use client";

import type { SignalOut } from "@/types";
import { SignalCard } from "./SignalCard";

export function SignalList({ signals }: { signals: SignalOut[] }) {
  if (signals.length === 0) {
    return <div className="card p-8 text-center text-slate-500">No high-confidence signals right now — the engine only emits a signal when multiple independent conditions align.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {signals.map((s) => (
        <SignalCard key={`${s.symbol}-${s.timeframe}`} signal={s} />
      ))}
    </div>
  );
}
