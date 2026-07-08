import { ema } from "./movingAverage";

export interface MacdResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): MacdResult {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = closes.map((_, i) =>
    Number.isNaN(emaFast[i]) || Number.isNaN(emaSlow[i]) ? NaN : emaFast[i] - emaSlow[i]
  );

  const validMacd = macdLine.filter((v) => !Number.isNaN(v));
  const signalOnValid = ema(validMacd, signalPeriod);
  const signalLine: number[] = new Array(macdLine.length).fill(NaN);
  let vi = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (!Number.isNaN(macdLine[i])) {
      signalLine[i] = signalOnValid[vi];
      vi++;
    }
  }

  const histogram = macdLine.map((v, i) =>
    Number.isNaN(v) || Number.isNaN(signalLine[i]) ? NaN : v - signalLine[i]
  );

  return { macd: macdLine, signal: signalLine, histogram };
}
