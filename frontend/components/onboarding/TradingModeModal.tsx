"use client";

import { useState } from "react";
import type { TradingMode } from "@/lib/types";

const MODES: { mode: TradingMode; title: string; timeframes: string; description: string }[] = [
  {
    mode: "scalping",
    title: "Scalping",
    timeframes: "1m · 3m · 5m",
    description: "Fast, high-frequency setups suited to quick in-and-out trades.",
  },
  {
    mode: "intraday",
    title: "Intraday",
    timeframes: "15m · 30m · 1h · 4h",
    description: "Larger structural moves held over hours within the trading day.",
  },
];

export function TradingModeModal({ onSelect }: { onSelect: (mode: TradingMode) => void }) {
  const [selected, setSelected] = useState<TradingMode | null>(null);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card-glow max-w-2xl w-full">
        <h2 className="text-xl font-bold text-white mb-1">Choose your trading mode</h2>
        <p className="text-sm text-gray-400 mb-6">
          This determines which timeframes the AI signal engine scans before your session starts.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {MODES.map((m) => (
            <button
              key={m.mode}
              onClick={() => setSelected(m.mode)}
              className={`text-left p-4 rounded-xl border transition-colors ${
                selected === m.mode ? "border-gold bg-gold/10" : "border-graphite bg-charcoal hover:border-gold/40"
              }`}
            >
              <div className="font-semibold text-white">{m.title}</div>
              <div className="text-xs text-gold mt-1">{m.timeframes}</div>
              <div className="text-xs text-gray-400 mt-2">{m.description}</div>
            </button>
          ))}
        </div>
        <button
          className="btn-primary w-full"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
        >
          Continue to Risk Setup
        </button>
      </div>
    </div>
  );
}
