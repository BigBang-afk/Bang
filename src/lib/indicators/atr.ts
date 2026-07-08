import { Candle } from "@/lib/types";

export function atr(candles: Candle[], period = 14): number[] {
  const trueRanges: number[] = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });

  const out: number[] = new Array(candles.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period) {
      sum += trueRanges[i];
      if (i === period - 1) out[i] = sum / period;
      continue;
    }
    out[i] = (out[i - 1] * (period - 1) + trueRanges[i]) / period;
  }
  return out;
}
