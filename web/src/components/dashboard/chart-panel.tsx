"use client";

import { useState } from "react";
import { AdvancedChart } from "@/components/tradingview/advanced-chart";
import { cn } from "@/lib/utils";

const SYMBOLS = [
  { label: "BTC/USD", value: "BITSTAMP:BTCUSD" },
  { label: "ETH/USD", value: "BITSTAMP:ETHUSD" },
  { label: "AAPL", value: "NASDAQ:AAPL" },
  { label: "TSLA", value: "NASDAQ:TSLA" },
  { label: "NVDA", value: "NASDAQ:NVDA" },
  { label: "S&P 500", value: "FOREXCOM:SPXUSD" },
  { label: "EUR/USD", value: "FX_IDC:EURUSD" },
  { label: "Gold", value: "TVC:GOLD" },
];

export function ChartPanel() {
  const [symbol, setSymbol] = useState(SYMBOLS[0].value);

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {SYMBOLS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSymbol(s.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              symbol === s.value
                ? "bg-brand-green/15 text-brand-green"
                : "text-foreground-muted hover:bg-surface hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <AdvancedChart symbol={symbol} className="h-[560px] w-full" />
    </div>
  );
}
