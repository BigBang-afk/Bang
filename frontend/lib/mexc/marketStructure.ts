// Ported from backend/app/services/market_structure.py — fractal swing detection,
// BOS/CHOCH classification, and basic SMC (order blocks, FVGs, liquidity pools).

import type { Candle } from "./indicators";

export interface SwingPoint {
  index: number;
  type: "swing_high" | "swing_low";
  price: number;
  time: number;
}

export function findSwingPoints(candles: Candle[], left = 3, right = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];
  const n = candles.length;

  for (let i = left; i < n - right; i++) {
    const windowHigh = candles.slice(i - left, i + right + 1).map((c) => c.high);
    const windowLow = candles.slice(i - left, i + right + 1).map((c) => c.low);
    const high = candles[i].high;
    const low = candles[i].low;

    if (high === Math.max(...windowHigh) && high === windowHigh[left]) {
      swings.push({ index: i, type: "swing_high", price: high, time: candles[i].time });
    }
    if (low === Math.min(...windowLow) && low === windowLow[left]) {
      swings.push({ index: i, type: "swing_low", price: low, time: candles[i].time });
    }
  }
  return swings.sort((a, b) => a.index - b.index);
}

export interface StructureLabel extends SwingPoint {
  label: "HH" | "HL" | "LH" | "LL";
}

export interface StructureEvent extends StructureLabel {
  event: "BOS" | "CHOCH";
  newTrend: "bullish" | "bearish";
}

export interface StructureResult {
  labels: StructureLabel[];
  events: StructureEvent[];
  currentTrend: "bullish" | "bearish" | "undefined";
}

export function classifyStructure(swings: SwingPoint[]): StructureResult {
  const highs = swings.filter((s) => s.type === "swing_high");
  const lows = swings.filter((s) => s.type === "swing_low");

  const labels: StructureLabel[] = [];
  for (let i = 1; i < highs.length; i++) {
    labels.push({ ...highs[i], label: highs[i].price > highs[i - 1].price ? "HH" : "LH" });
  }
  for (let i = 1; i < lows.length; i++) {
    labels.push({ ...lows[i], label: lows[i].price > lows[i - 1].price ? "HL" : "LL" });
  }
  labels.sort((a, b) => a.index - b.index);

  let trend: "bullish" | "bearish" | "undefined" = "undefined";
  let lastTrend: "bullish" | "bearish" | null = null;
  const events: StructureEvent[] = [];

  for (const lab of labels) {
    const currentTrend: "bullish" | "bearish" = lab.label === "HH" || lab.label === "HL" ? "bullish" : "bearish";
    if (lastTrend && currentTrend !== lastTrend) {
      events.push({ ...lab, event: "CHOCH", newTrend: currentTrend });
    } else if (lastTrend === currentTrend) {
      events.push({ ...lab, event: "BOS", newTrend: currentTrend });
    }
    lastTrend = currentTrend;
    trend = currentTrend;
  }

  return { labels, events, currentTrend: trend };
}

export interface OrderBlock {
  type: "bullish_order_block" | "bearish_order_block";
  high: number;
  low: number;
  time: number;
}

export function detectOrderBlocks(candles: Candle[], swings: SwingPoint[], lookback = 15): OrderBlock[] {
  const blocks: OrderBlock[] = [];
  for (const swing of swings.slice(-lookback)) {
    const idx = swing.index;
    if (idx < 1 || idx >= candles.length) continue;
    const candle = candles[idx];
    const prev = candles[idx - 1];

    if (swing.type === "swing_low" && prev.close > prev.open && candle.close < candle.open) {
      blocks.push({ type: "bullish_order_block", high: prev.high, low: prev.low, time: prev.time });
    }
    if (swing.type === "swing_high" && prev.close < prev.open && candle.close > candle.open) {
      blocks.push({ type: "bearish_order_block", high: prev.high, low: prev.low, time: prev.time });
    }
  }
  return blocks;
}

export interface FairValueGap {
  type: "bullish_fvg" | "bearish_fvg";
  top: number;
  bottom: number;
  time: number;
}

export function detectFairValueGaps(candles: Candle[]): FairValueGap[] {
  const gaps: FairValueGap[] = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const next = candles[i + 1];
    if (prev.high < next.low) gaps.push({ type: "bullish_fvg", top: next.low, bottom: prev.high, time: candles[i].time });
    if (prev.low > next.high) gaps.push({ type: "bearish_fvg", top: prev.low, bottom: next.high, time: candles[i].time });
  }
  return gaps;
}

export interface LiquidityPool {
  type: "equal_highs" | "equal_lows";
  priceA: number;
  priceB: number;
  level: number;
}

export function detectLiquidityPools(swings: SwingPoint[], tolerancePct = 0.05): LiquidityPool[] {
  const pools: LiquidityPool[] = [];
  const highs = swings.filter((s) => s.type === "swing_high");
  const lows = swings.filter((s) => s.type === "swing_low");

  for (const [group, label] of [
    [highs, "equal_highs"] as const,
    [lows, "equal_lows"] as const,
  ]) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i].price;
        const b = group[j].price;
        if ((Math.abs(a - b) / Math.max(a, b)) * 100 <= tolerancePct) {
          pools.push({ type: label, priceA: a, priceB: b, level: (a + b) / 2 });
        }
      }
    }
  }
  return pools;
}

export function premiumDiscountZone(currentPrice: number, rangeHigh: number, rangeLow: number): "premium" | "discount" | "equilibrium" {
  if (rangeHigh === rangeLow) return "equilibrium";
  const fib = (currentPrice - rangeLow) / (rangeHigh - rangeLow);
  if (fib >= 0.618) return "premium";
  if (fib <= 0.382) return "discount";
  return "equilibrium";
}
