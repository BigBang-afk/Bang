/**
 * Support/resistance detection from swing highs and lows.
 *
 * Pure and provider-agnostic, like the rest of this package: it only reads
 * the candles it's given (closed candles — callers apply the same
 * no-repaint discipline as scoring.ts). A level is a cluster of nearby
 * swing points, not a single touch, so a lone spike doesn't count as a
 * "level" the way a repeatedly-defended price does.
 */

import type { OHLCVCandle } from "@/lib/market-data/types";

export interface SupportResistanceLevel {
  type: "support" | "resistance";
  price: number;
  /** How many swing points clustered into this level — a rough strength proxy. */
  touches: number;
}

const PIVOT_WINDOW = 2; // candles on each side that must be less extreme
const CLUSTER_TOLERANCE_PERCENT = 0.5; // merge swing points within 0.5% of each other

function findPivotHighs(candles: OHLCVCandle[]): number[] {
  const pivots: number[] = [];
  for (let i = PIVOT_WINDOW; i < candles.length - PIVOT_WINDOW; i++) {
    const high = candles[i].high;
    let isPivot = true;
    for (let j = i - PIVOT_WINDOW; j <= i + PIVOT_WINDOW; j++) {
      if (j === i) continue;
      if (candles[j].high >= high) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) pivots.push(high);
  }
  return pivots;
}

function findPivotLows(candles: OHLCVCandle[]): number[] {
  const pivots: number[] = [];
  for (let i = PIVOT_WINDOW; i < candles.length - PIVOT_WINDOW; i++) {
    const low = candles[i].low;
    let isPivot = true;
    for (let j = i - PIVOT_WINDOW; j <= i + PIVOT_WINDOW; j++) {
      if (j === i) continue;
      if (candles[j].low <= low) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) pivots.push(low);
  }
  return pivots;
}

function clusterPrices(prices: number[]): { price: number; touches: number }[] {
  if (prices.length === 0) return [];
  const sorted = [...prices].sort((a, b) => a - b);
  const clusters: { sum: number; count: number }[] = [];

  for (const price of sorted) {
    const last = clusters[clusters.length - 1];
    const clusterAvg = last ? last.sum / last.count : null;
    if (last && clusterAvg !== null && Math.abs(price - clusterAvg) / clusterAvg <= CLUSTER_TOLERANCE_PERCENT / 100) {
      last.sum += price;
      last.count += 1;
    } else {
      clusters.push({ sum: price, count: 1 });
    }
  }

  return clusters.map((c) => ({ price: c.sum / c.count, touches: c.count }));
}

/**
 * Finds the strongest support/resistance levels within `lookback` closed
 * candles, relative to `currentPrice`. Returns at most `maxPerSide` of each,
 * strongest (most touches) first. Never fabricates a level — an asset with
 * too little history simply returns fewer (or zero) levels.
 */
export function findSupportResistanceLevels(
  candles: OHLCVCandle[],
  currentPrice: number,
  options: { lookback?: number; maxPerSide?: number } = {}
): SupportResistanceLevel[] {
  const { lookback = 90, maxPerSide = 3 } = options;
  const window = candles.slice(-lookback);
  if (window.length < PIVOT_WINDOW * 2 + 1) return [];

  const highClusters = clusterPrices(findPivotHighs(window));
  const lowClusters = clusterPrices(findPivotLows(window));

  const resistance = highClusters
    .filter((c) => c.price > currentPrice)
    .sort((a, b) => b.touches - a.touches || a.price - currentPrice - (b.price - currentPrice))
    .slice(0, maxPerSide)
    .map((c) => ({ type: "resistance" as const, price: c.price, touches: c.touches }));

  const support = lowClusters
    .filter((c) => c.price < currentPrice)
    .sort((a, b) => b.touches - a.touches || currentPrice - a.price - (currentPrice - b.price))
    .slice(0, maxPerSide)
    .map((c) => ({ type: "support" as const, price: c.price, touches: c.touches }));

  return [...support, ...resistance].sort((a, b) => a.price - b.price);
}
