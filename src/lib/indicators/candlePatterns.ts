import { Candle } from "@/lib/types";

export function bodySize(c: Candle): number {
  return Math.abs(c.close - c.open);
}

export function range(c: Candle): number {
  return Math.max(c.high - c.low, 1e-9);
}

export function bodyStrength(c: Candle): number {
  return bodySize(c) / range(c);
}

export function isBullish(c: Candle): boolean {
  return c.close > c.open;
}

export function upperWick(c: Candle): number {
  return c.high - Math.max(c.open, c.close);
}

export function lowerWick(c: Candle): number {
  return Math.min(c.open, c.close) - c.low;
}

/** Positive = bullish rejection (long lower wick), negative = bearish rejection (long upper wick). */
export function wickRejectionScore(c: Candle): number {
  const r = range(c);
  const lower = lowerWick(c) / r;
  const upper = upperWick(c) / r;
  return lower - upper;
}

/** Body of current candle bigger than previous candle's body, in the same direction = momentum. */
export function momentumCandle(curr: Candle, prev: Candle): "bullish" | "bearish" | "none" {
  if (bodySize(curr) > bodySize(prev) * 1.05) {
    if (isBullish(curr)) return "bullish";
    if (!isBullish(curr)) return "bearish";
  }
  return "none";
}

/** Green body stronger than previous red body (or vice versa). */
export function candleOverpowersPrevious(curr: Candle, prev: Candle): "bullish" | "bearish" | "none" {
  if (isBullish(curr) && !isBullish(prev) && bodySize(curr) > bodySize(prev)) return "bullish";
  if (!isBullish(curr) && isBullish(prev) && bodySize(curr) > bodySize(prev)) return "bearish";
  return "none";
}

export function averageBodySize(candles: Candle[]): number {
  if (candles.length === 0) return 0;
  return candles.reduce((acc, c) => acc + bodySize(c), 0) / candles.length;
}

/** Net directional pressure across a window: -1 (all bearish) .. +1 (all bullish), weighted by body size. */
export function candlePressure(candles: Candle[]): number {
  const totalBody = candles.reduce((acc, c) => acc + bodySize(c), 0);
  if (totalBody === 0) return 0;
  const signedBody = candles.reduce(
    (acc, c) => acc + (isBullish(c) ? bodySize(c) : -bodySize(c)),
    0
  );
  return signedBody / totalBody;
}

/** Breaks the recent high/low of the prior N candles (excluding current) and closes beyond it. */
export function breakout(candles: Candle[], lookback = 10): "bullish" | "bearish" | "none" {
  if (candles.length < lookback + 1) return "none";
  const curr = candles[candles.length - 1];
  const prior = candles.slice(candles.length - 1 - lookback, candles.length - 1);
  const priorHigh = Math.max(...prior.map((c) => c.high));
  const priorLow = Math.min(...prior.map((c) => c.low));
  if (curr.close > priorHigh) return "bullish";
  if (curr.close < priorLow) return "bearish";
  return "none";
}

/** After a breakout, price retraces toward the broken level then resumes = retest confirmation. */
export function breakoutRetest(candles: Candle[], lookback = 10): "bullish" | "bearish" | "none" {
  if (candles.length < lookback + 3) return "none";
  const window = candles.slice(candles.length - (lookback + 3));
  const breakoutCandle = window[0];
  const prior = candles.slice(
    candles.length - (lookback + 3) - lookback,
    candles.length - (lookback + 3)
  );
  if (prior.length === 0) return "none";
  const priorHigh = Math.max(...prior.map((c) => c.high));
  const priorLow = Math.min(...prior.map((c) => c.low));
  const retestCandles = window.slice(1, -1);
  const last = window[window.length - 1];

  if (breakoutCandle.close > priorHigh) {
    const retested = retestCandles.some((c) => c.low <= priorHigh * 1.0005);
    if (retested && last.close > priorHigh) return "bullish";
  }
  if (breakoutCandle.close < priorLow) {
    const retested = retestCandles.some((c) => c.high >= priorLow * 0.9995);
    if (retested && last.close < priorLow) return "bearish";
  }
  return "none";
}

/** Small pullback against the dominant trend followed by a resumption candle. */
export function pullbackConfirmation(candles: Candle[], trendUp: boolean): boolean {
  if (candles.length < 4) return false;
  const recent = candles.slice(-4);
  const [c1, c2, c3, c4] = recent;
  if (trendUp) {
    const pulledBack = !isBullish(c2) || !isBullish(c3);
    return pulledBack && isBullish(c4) && c4.close > Math.max(c2.high, c3.high);
  }
  const pulledBack = isBullish(c2) || isBullish(c3);
  return pulledBack && !isBullish(c4) && c4.close < Math.min(c2.low, c3.low);
}

/** Wick sweeps beyond a recent extreme then closes back inside it = liquidity grab. */
export function liquiditySweep(candles: Candle[], lookback = 10): "bullish" | "bearish" | "none" {
  if (candles.length < lookback + 1) return "none";
  const curr = candles[candles.length - 1];
  const prior = candles.slice(candles.length - 1 - lookback, candles.length - 1);
  const priorHigh = Math.max(...prior.map((c) => c.high));
  const priorLow = Math.min(...prior.map((c) => c.low));

  if (curr.high > priorHigh && curr.close < priorHigh) return "bearish";
  if (curr.low < priorLow && curr.close > priorLow) return "bullish";
  return "none";
}
