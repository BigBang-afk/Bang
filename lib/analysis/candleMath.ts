import type { PixelCandle } from "./types";

export function bodyTop(c: PixelCandle): number {
  return Math.min(c.openY, c.closeY);
}

export function bodyBottom(c: PixelCandle): number {
  return Math.max(c.openY, c.closeY);
}

export function bodySize(c: PixelCandle): number {
  return bodyBottom(c) - bodyTop(c);
}

export function range(c: PixelCandle): number {
  return Math.max(c.lowY - c.highY, 1);
}

export function upperWick(c: PixelCandle): number {
  return Math.max(0, bodyTop(c) - c.highY);
}

export function lowerWick(c: PixelCandle): number {
  return Math.max(0, c.lowY - bodyBottom(c));
}

export function bodyRatio(c: PixelCandle): number {
  return bodySize(c) / range(c);
}

export function isBullish(c: PixelCandle): boolean {
  return c.color === "bullish";
}

export function isBearish(c: PixelCandle): boolean {
  return c.color === "bearish";
}

/** Average close-to-close slope over the preceding `lookback` candles,
 * expressed in pixel-y units per candle. Negative means price rising
 * (y decreasing), positive means price falling. */
export function precedingSlope(
  candles: PixelCandle[],
  atIndex: number,
  lookback = 5,
): number {
  const start = Math.max(0, atIndex - lookback);
  if (atIndex - start < 2) return 0;
  const first = candles[start].closeY;
  const last = candles[atIndex - 1]?.closeY ?? first;
  return (last - first) / (atIndex - start);
}

export type TrendBias = "up" | "down" | "flat";

export function precedingTrendBias(
  candles: PixelCandle[],
  atIndex: number,
  lookback = 5,
): TrendBias {
  const avgRange =
    candles.slice(Math.max(0, atIndex - lookback), atIndex).reduce((sum, c) => sum + range(c), 0) /
    Math.max(1, Math.min(lookback, atIndex));
  const slope = precedingSlope(candles, atIndex, lookback);
  if (!avgRange || Math.abs(slope) < avgRange * 0.15) return "flat";
  return slope < 0 ? "up" : "down";
}
