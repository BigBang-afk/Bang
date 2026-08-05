"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { api } from "@/lib/api";
import { StatCard } from "@/components/common/StatCard";
import type { BacktestResult, Timeframe } from "@/types";

const TIMEFRAMES: Timeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

export default function BacktestingPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [capital, setCapital] = useState(10000);

  const mutation = useMutation({
    mutationFn: () =>
      api
        .post<BacktestResult>("/backtest/run", { symbol, timeframe, initial_capital: capital, lookback_candles: 1000 })
        .then((r) => r.data),
  });

  const result = mutation.data;
  const equityData = result?.equity_curve.map((v, i) => ({ index: i, equity: v })) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Backtesting</h1>
        <p className="text-sm text-slate-500">
          Replays the live signal engine bar-by-bar over historical MEXC candles to see how it would have performed.
        </p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm w-32"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm"
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Initial Capital</label>
          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm w-32"
          />
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="bg-accent-brand text-white rounded px-4 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {mutation.isPending ? "Running…" : "Run Backtest"}
        </button>
      </div>

      {mutation.isError && <div className="card p-4 text-accent-sell text-sm">Backtest failed — check symbol/timeframe and data availability.</div>}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Win Rate" value={`${result.metrics.win_rate ?? "–"}%`} />
            <StatCard label="Profit Factor" value={result.metrics.profit_factor ?? "–"} />
            <StatCard label="Max Drawdown" value={`${result.metrics.max_drawdown_percent ?? "–"}%`} tone="negative" />
            <StatCard label="Sharpe Ratio" value={result.metrics.sharpe_ratio ?? "–"} />
            <StatCard label="Expectancy" value={result.metrics.expectancy ?? "–"} />
            <StatCard label="Avg Win / Loss" value={`${result.metrics.average_win} / ${result.metrics.average_loss}`} />
            <StatCard label="Trades" value={result.metrics.number_of_trades} />
            <StatCard
              label="Total Return"
              value={`${result.total_return_percent}%`}
              tone={result.total_return_percent >= 0 ? "positive" : "negative"}
            />
          </div>

          <div className="card p-4 h-80">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Equity Curve</h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={equityData}>
                <CartesianGrid stroke="#1a2130" />
                <XAxis dataKey="index" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "#11161f", border: "1px solid #242d40" }} />
                <Line type="monotone" dataKey="equity" stroke="#3b82f6" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
