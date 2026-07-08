import { Candle, Direction, ExpiryKey, GeneratedSignal, Pair } from "@/lib/types";
import { generateSignalFromCandles } from "@/lib/engine/signalEngine";
import { ParsedCandleRow } from "./csv";

export interface BacktestTradeResult {
  index: number;
  time: number;
  pair: string;
  direction: Direction;
  confidence: number;
  result: "WIN" | "LOSS";
  reason: string;
}

export interface BacktestSummary {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgConfidence: number;
  bestPair: string;
  worstPair: string;
  winStreak: number;
  lossStreak: number;
  trades: BacktestTradeResult[];
  perPair: Record<string, { trades: number; wins: number; winRate: number }>;
}

const MIN_CONTEXT = 60;

export function runBacktest(
  rows: ParsedCandleRow[],
  fallbackPair: Pair,
  expiry: ExpiryKey
): BacktestSummary {
  if (rows.length < MIN_CONTEXT + 2) {
    throw new Error(
      `Need at least ${MIN_CONTEXT + 2} candle rows to backtest (got ${rows.length})`
    );
  }

  const trades: BacktestTradeResult[] = [];
  const perPair: Record<string, { trades: number; wins: number; winRate: number }> = {};

  const MAX_CONTEXT_WINDOW = 200; // bound per-iteration indicator recompute cost

  for (let i = MIN_CONTEXT; i < rows.length - 1; i++) {
    const windowStart = Math.max(0, i + 1 - MAX_CONTEXT_WINDOW);
    const historySlice: Candle[] = rows.slice(windowStart, i + 1).map((r) => ({
      time: r.time,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
    }));
    const pairLabel = rows[i].pair ?? fallbackPair;
    const next = rows[i + 1];

    const signal: GeneratedSignal = generateSignalFromCandles(
      fallbackPair,
      expiry,
      historySlice,
      rows[i].time,
      next.time
    );

    const won =
      signal.direction === "CALL" ? next.close > rows[i].close : next.close < rows[i].close;

    const result: "WIN" | "LOSS" = won ? "WIN" : "LOSS";

    trades.push({
      index: i,
      time: rows[i].time,
      pair: pairLabel,
      direction: signal.direction,
      confidence: signal.confidence,
      result,
      reason: signal.reason,
    });

    if (!perPair[pairLabel]) perPair[pairLabel] = { trades: 0, wins: 0, winRate: 0 };
    perPair[pairLabel].trades++;
    if (won) perPair[pairLabel].wins++;
  }

  for (const key of Object.keys(perPair)) {
    perPair[key].winRate = (perPair[key].wins / perPair[key].trades) * 100;
  }

  const wins = trades.filter((t) => t.result === "WIN").length;
  const losses = trades.length - wins;
  const avgConfidence =
    trades.reduce((acc, t) => acc + t.confidence, 0) / (trades.length || 1);

  let winStreak = 0;
  let lossStreak = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const t of trades) {
    if (t.result === "WIN") {
      curWin++;
      curLoss = 0;
    } else {
      curLoss++;
      curWin = 0;
    }
    winStreak = Math.max(winStreak, curWin);
    lossStreak = Math.max(lossStreak, curLoss);
  }

  const pairEntries = Object.entries(perPair).filter(([, v]) => v.trades >= 3);
  let bestPair = fallbackPair as string;
  let worstPair = fallbackPair as string;
  if (pairEntries.length > 0) {
    bestPair = pairEntries.reduce((a, b) => (b[1].winRate > a[1].winRate ? b : a))[0];
    worstPair = pairEntries.reduce((a, b) => (b[1].winRate < a[1].winRate ? b : a))[0];
  }

  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    avgConfidence,
    bestPair,
    worstPair,
    winStreak,
    lossStreak,
    trades,
    perPair,
  };
}
