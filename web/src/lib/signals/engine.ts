import { Candle, fetchCandles } from "./candles";
import { visiblePivots } from "./indicators";
import {
  Confluence,
  Indicators,
  StrategyVote,
  computeIndicators,
  evaluateAt,
  warmupIndex,
} from "./strategies";

const ATR_STOP_MULTIPLIER = 1.5;
const TP_R_MULTIPLES = [1, 2, 3.5] as const;
const BACKTEST_LOOKAHEAD = 24; // bars to look forward when scoring a historical signal
const BACKTEST_WINDOW = 260; // how many recent bars to walk forward across

export interface TradeLevels {
  entry: number;
  stopLoss: number;
  takeProfits: number[]; // [TP1, TP2, TP3]
  atr: number;
  riskPerUnit: number;
}

export function computeLevels(direction: "LONG" | "SHORT", entry: number, atrValue: number): TradeLevels {
  const stopDistance = atrValue * ATR_STOP_MULTIPLIER;
  const sign = direction === "LONG" ? 1 : -1;

  const stopLoss = entry - sign * stopDistance;
  const takeProfits = TP_R_MULTIPLES.map((r) => entry + sign * stopDistance * r);

  return { entry, stopLoss, takeProfits, atr: atrValue, riskPerUnit: stopDistance };
}

export interface TrailingRule {
  after: string;
  action: string;
}

export const TRAILING_PLAN: TrailingRule[] = [
  { after: "Entry", action: "Initial stop placed at 1.5× ATR from entry." },
  { after: "TP1", action: "Move stop to breakeven (entry price) — the trade can no longer lose." },
  {
    after: "TP2",
    action: "Switch to a trailing stop: 1.5× ATR behind the highest close (LONG) or lowest close (SHORT) reached since entry.",
  },
  { after: "TP3", action: "Close remaining position or keep trailing for a runner, trader's choice." },
];

export interface NearbyLevel {
  price: number;
  distancePct: number;
}

export interface AiSignal {
  symbol: string;
  timeframe: string;
  generatedAt: number;
  price: number;
  confluence: Confluence;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  levels: TradeLevels | null;
  trailing: TrailingRule[];
  nearestSupport: NearbyLevel | null;
  nearestResistance: NearbyLevel | null;
  backtest: BacktestResult;
}

export interface BacktestResult {
  totalSignals: number;
  wins: number;
  losses: number;
  inconclusive: number;
  winRate: number | null; // null when there isn't enough sample size
}

export async function generateSignal(symbol: string, timeframe = "1h"): Promise<AiSignal> {
  const candles = await fetchCandles(symbol, timeframe, 320);
  return buildSignalFromCandles(symbol, timeframe, candles);
}

export function buildSignalFromCandles(symbol: string, timeframe: string, candles: Candle[]): AiSignal {
  if (candles.length < warmupIndex() + 20) {
    throw new Error("Not enough candle history to run analysis");
  }

  const ind = computeIndicators(candles);
  const lastIndex = candles.length - 1;
  const confluence = evaluateAt(candles, ind, lastIndex);
  const price = candles[lastIndex].close;

  const levels =
    confluence.confirmed && confluence.direction !== "NEUTRAL"
      ? computeLevels(confluence.direction, price, ind.atr14[lastIndex])
      : null;

  const nearLows = visiblePivots(ind.pivots.pivotLows, lastIndex, 1);
  const nearHighs = visiblePivots(ind.pivots.pivotHighs, lastIndex, 1);
  const nearestSupport = nearLows[0]
    ? { price: nearLows[0].price, distancePct: ((price - nearLows[0].price) / price) * 100 }
    : null;
  const nearestResistance = nearHighs[0]
    ? { price: nearHighs[0].price, distancePct: ((nearHighs[0].price - price) / price) * 100 }
    : null;

  const backtest = runBacktest(candles, ind);

  return {
    symbol,
    timeframe,
    generatedAt: Date.now(),
    price,
    confluence,
    direction: confluence.direction,
    levels,
    trailing: TRAILING_PLAN,
    nearestSupport,
    nearestResistance,
    backtest,
  };
}

/**
 * Walk-forward replay: re-runs the exact same confluence logic at every
 * historical bar, and for every bar where it would have fired a confirmed
 * signal, checks whether price hit TP1 or the stop loss first within the
 * lookahead window. This is a real (if simplified) computed win rate, not a
 * static marketing number — it only uses information available *at that
 * point in time* (no look-ahead bias in the indicators themselves).
 */
function runBacktest(candles: Candle[], ind: Indicators): BacktestResult {
  const start = Math.max(warmupIndex(), candles.length - BACKTEST_WINDOW);
  const end = candles.length - 1 - BACKTEST_LOOKAHEAD;

  let wins = 0;
  let losses = 0;
  let inconclusive = 0;

  for (let i = start; i <= end; i++) {
    const result = evaluateAt(candles, ind, i);
    if (!result.confirmed || result.direction === "NEUTRAL") continue;

    const entry = candles[i].close;
    const levels = computeLevels(result.direction, entry, ind.atr14[i]);
    const tp1 = levels.takeProfits[0];
    const sl = levels.stopLoss;

    let outcome: "win" | "loss" | "open" = "open";
    for (let j = i + 1; j <= i + BACKTEST_LOOKAHEAD; j++) {
      const bar = candles[j];
      const hitTp = result.direction === "LONG" ? bar.high >= tp1 : bar.low <= tp1;
      const hitSl = result.direction === "LONG" ? bar.low <= sl : bar.high >= sl;

      // If both would trigger within the same bar we can't know which came
      // first from OHLC alone, so treat it conservatively as a loss.
      if (hitTp && hitSl) {
        outcome = "loss";
        break;
      }
      if (hitTp) {
        outcome = "win";
        break;
      }
      if (hitSl) {
        outcome = "loss";
        break;
      }
    }

    if (outcome === "win") wins++;
    else if (outcome === "loss") losses++;
    else inconclusive++;
  }

  const decided = wins + losses;
  return {
    totalSignals: wins + losses + inconclusive,
    wins,
    losses,
    inconclusive,
    winRate: decided >= 5 ? Math.round((wins / decided) * 100) : null,
  };
}

export const SUPPORTED_TIMEFRAMES = [
  { value: "15m", label: "15m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
] as const;

export type { StrategyVote };
