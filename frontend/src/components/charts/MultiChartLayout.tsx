"use client";

import { useState } from "react";
import { TradingChart } from "./TradingChart";

const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];

export function MultiChartLayout() {
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);

  function updateSymbol(index: number, value: string) {
    setSymbols((prev) => prev.map((s, i) => (i === index ? value.toUpperCase() : s)));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[900px]">
      {symbols.map((symbol, i) => (
        <div key={i} className="flex flex-col gap-1 h-[440px]">
          <input
            value={symbol}
            onChange={(e) => updateSymbol(i, e.target.value)}
            className="bg-base-800 border border-base-700 rounded px-2 py-1 text-xs w-32"
          />
          <div className="flex-1">
            <TradingChart symbol={symbol} />
          </div>
        </div>
      ))}
    </div>
  );
}
