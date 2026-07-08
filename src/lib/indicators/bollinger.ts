import { sma } from "./movingAverage";

export interface BollingerResult {
  upper: number[];
  middle: number[];
  lower: number[];
  bandwidth: number[];
}

export function bollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2
): BollingerResult {
  const middle = sma(closes, period);
  const upper: number[] = new Array(closes.length).fill(NaN);
  const lower: number[] = new Array(closes.length).fill(NaN);
  const bandwidth: number[] = new Array(closes.length).fill(NaN);

  for (let i = 0; i < closes.length; i++) {
    if (Number.isNaN(middle[i])) continue;
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    upper[i] = mean + stdDevMultiplier * stdDev;
    lower[i] = mean - stdDevMultiplier * stdDev;
    bandwidth[i] = mean !== 0 ? (upper[i] - lower[i]) / mean : 0;
  }

  return { upper, middle, lower, bandwidth };
}
