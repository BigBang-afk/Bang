import type { CandleColor, PatternDirection, PixelCandle, TrendContext } from "./types";
import { bodySize } from "./candleMath";

function sma(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function buildTrend(candles: PixelCandle[]): TrendContext {
  const closes = candles.map((c) => c.closeY);
  const shortN = Math.min(5, candles.length);
  const longN = Math.min(14, candles.length);

  const shortSma = sma(closes.slice(-shortN));
  const longSma = sma(closes.slice(-longN));

  // Smaller y = higher price, so a short SMA below the long SMA means
  // recent price action sits above the longer-term average: uptrend.
  const diff = longSma - shortSma;
  const avgRange = sma(candles.slice(-longN).map((c) => c.lowY - c.highY)) || 1;
  let slopeDirection: PatternDirection = "neutral";
  if (Math.abs(diff) > avgRange * 0.2) {
    slopeDirection = diff > 0 ? "bullish" : "bearish";
  }

  let streakColor: CandleColor = candles[candles.length - 1].color;
  let streakLength = 0;
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].color === streakColor) streakLength++;
    else break;
  }

  const recentBodies = candles.slice(-6).map(bodySize);
  const firstHalf = sma(recentBodies.slice(0, Math.floor(recentBodies.length / 2)));
  const secondHalf = sma(recentBodies.slice(Math.floor(recentBodies.length / 2)));
  let bodyMomentum: TrendContext["bodyMomentum"] = "flat";
  if (firstHalf > 0) {
    if (secondHalf > firstHalf * 1.25) bodyMomentum = "expanding";
    else if (secondHalf < firstHalf * 0.75) bodyMomentum = "contracting";
  }

  return {
    shortSma,
    longSma,
    slopeDirection,
    streak: { color: streakColor, length: streakLength },
    bodyMomentum,
  };
}
