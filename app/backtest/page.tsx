"use client";

import { useState } from "react";
import Link from "next/link";
import type { BacktestResult } from "@/lib/backtest/types";

const PAIRS = [
  { value: "XBTUSD", label: "BTC/USD" },
  { value: "ETHUSD", label: "ETH/USD" },
  { value: "XRPUSD", label: "XRP/USD" },
  { value: "LTCUSD", label: "LTC/USD" },
];

export default function BacktestPage() {
  const [mode, setMode] = useState<"kraken" | "csv">("kraken");
  const [pair, setPair] = useState("XBTUSD");
  const [count, setCount] = useState(700);
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body =
        mode === "kraken" ? { source: "kraken", pair, count } : { source: "csv", csv };
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Backtest failed.");
        return;
      }
      setResult(data as BacktestResult);
    } catch {
      setError("Couldn't reach the backtest server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <Link href="/" className="text-xs text-slate-500 underline hover:text-slate-300">
          ← back to scanner
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-100">Honest Accuracy Backtest</h1>
        <p className="mt-1 text-sm text-slate-400">
          Runs the exact same pattern/level/trend/signal engine used by the scanner against
          historical 1-minute candles, then checks what actually happened next. No tuning to look
          good — the number this prints is the number you get.
        </p>
      </header>

      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-200/90">
        <strong className="text-amber-300">Important:</strong> Quotex runs its own price feed —
        especially for OTC/weekend synthetic pairs — which isn&apos;t available through any public
        API. The results below use real exchange data (Kraken) as an honest proxy for testing the
        engine&apos;s logic in general. They are not a measurement of Quotex&apos;s own quotes, and
        past performance on any data set is never a guarantee of future results.
      </div>

      <div className="mb-6 flex gap-2 text-sm">
        <button
          onClick={() => setMode("kraken")}
          className={`rounded-md border px-3 py-1.5 ${mode === "kraken" ? "border-emerald-500 text-emerald-400" : "border-slate-700 text-slate-400"}`}
        >
          Live market data (Kraken)
        </button>
        <button
          onClick={() => setMode("csv")}
          className={`rounded-md border px-3 py-1.5 ${mode === "csv" ? "border-emerald-500 text-emerald-400" : "border-slate-700 text-slate-400"}`}
        >
          Paste my own CSV
        </button>
      </div>

      {mode === "kraken" ? (
        <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div>
            <label className="block text-xs text-slate-400">Pair</label>
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
            >
              {PAIRS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">
              1-min bars to test (60-700 — Kraken&apos;s free API only keeps ~12h of 1-min history)
            </label>
            <input
              type="number"
              min={60}
              max={700}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1 w-32 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Running…" : "Run backtest"}
          </button>
        </div>
      ) : (
        <div className="mb-6 space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <label className="block text-xs text-slate-400">
            CSV: one bar per line, either <code>time,open,high,low,close</code> or{" "}
            <code>open,high,low,close</code>, oldest first.
          </label>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={8}
            placeholder={"1700000000,65210.5,65240,65190,65225\n1700000060,65225,65260,65220,65250"}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs"
          />
          <button
            onClick={run}
            disabled={loading || csv.trim().length === 0}
            className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Running…" : "Run backtest"}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && <Results result={result} />}
    </main>
  );
}

function Results({ result }: { result: BacktestResult }) {
  const winRate = result.winRatePct;
  const good = winRate !== null && winRate >= 55;

  return (
    <div className="space-y-6">
      <section
        className={`rounded-2xl p-6 ring-1 ${good ? "bg-emerald-500/10 ring-emerald-500/40" : "bg-slate-900/40 ring-slate-800"}`}
      >
        <p className="text-xs uppercase tracking-wide text-slate-400">{result.source}</p>
        <p className="mt-1 text-3xl font-bold text-slate-100">
          {winRate !== null ? `${winRate.toFixed(1)}% real win rate` : "No trades taken"}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {result.tradesTaken} trades taken ({result.wins} correct, {result.losses} wrong) out of{" "}
          {result.barsUsed} bars · {result.waits} scans said WAIT and were skipped
          {result.flats > 0 && <> · {result.flats} landed on a no-movement price and were excluded</>}
        </p>
        {result.expectancyPerTrade !== null && (
          <p className="mt-3 text-sm">
            Expectancy at an 85% binary-option payout:{" "}
            <span className={result.expectancyPerTrade > 0 ? "text-emerald-400" : "text-red-400"}>
              {result.expectancyPerTrade > 0 ? "+" : ""}
              {(result.expectancyPerTrade * 100).toFixed(1)}% per trade
            </span>{" "}
            <span className="text-slate-500">
              (need ~54% win rate just to break even at that payout — a positive number here is
              the bar, not proof of a real edge on a bigger sample)
            </span>
          </p>
        )}
      </section>

      {result.warnings.length > 0 && (
        <ul className="text-xs text-amber-300">
          {result.warnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-slate-200">
          Confidence calibration — does &quot;79%&quot; actually mean 79%?
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          For each confidence range the engine displayed, this is the real win rate it achieved in
          this sample. If the right column tracks the left column, confidence is calibrated. If
          it&apos;s flat around 50% regardless of the stated confidence, the confidence number
          isn&apos;t meaningfully predictive.
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pb-1">Confidence shown</th>
              <th className="pb-1">Trades</th>
              <th className="pb-1">Actual win rate</th>
            </tr>
          </thead>
          <tbody>
            {result.buckets.map((b) => (
              <tr key={b.range} className="border-t border-slate-800">
                <td className="py-1.5">{b.range}</td>
                <td className="py-1.5 text-slate-400">{b.trades}</td>
                <td className="py-1.5">
                  {b.winRatePct !== null ? `${b.winRatePct.toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-slate-200">Compared to doing something dumber</h3>
        <p className="mt-1 text-xs text-slate-500">
          Same bars, same trade timing — if the engine isn&apos;t clearly beating these, it has no
          real edge over guessing.
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pb-1">Strategy</th>
              <th className="pb-1">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {result.baseline.map((b) => (
              <tr key={b.label} className="border-t border-slate-800">
                <td className="py-1.5">{b.label}</td>
                <td className="py-1.5">
                  {b.winRatePct !== null ? `${b.winRatePct.toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
