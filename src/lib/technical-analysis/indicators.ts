/**
 * Technical indicator calculations. Pure functions, no I/O, no framework
 * dependency — safe to unit test directly and safe to run anywhere
 * (server route, script, or client if ever needed).
 *
 * Conventions:
 *   - Every function returns an array the same length as its input, with
 *     `null` wherever there isn't yet enough history to compute a value
 *     (the standard "warm-up period" gap). This keeps every output
 *     index-aligned with the input candles, which matters for both
 *     testing and for the no-repaint guarantees in candles.ts — callers
 *     always know which indicator value corresponds to which candle.
 *   - All periods are function parameters with sane defaults — nothing
 *     here hard-codes "the" RSI period etc. (see types.ts for the
 *     defaults used by the scanner).
 */

import type { OHLCVCandle } from "@/lib/market-data/types";

export type Series = Array<number | null>;

/** Simple moving average. */
export function sma(values: Series, period: number): Series {
  if (period < 1) throw new Error("period must be >= 1");
  const result: Series = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    let ok = true;
    for (let j = i - period + 1; j <= i; j++) {
      const v = values[j];
      if (v === null) {
        ok = false;
        break;
      }
      sum += v;
    }
    if (ok) result[i] = sum / period;
  }
  return result;
}

/**
 * Exponential moving average. Accepts a series that may start with
 * `null`s (e.g. another indicator's warm-up gap) — it seeds itself with a
 * plain average of the first `period` non-null values once they appear,
 * then applies the standard EMA recursion. This lets MACD's signal line
 * (an EMA of the MACD line, which itself has a warm-up gap) reuse this
 * same function.
 */
export function ema(values: Series, period: number): Series {
  if (period < 1) throw new Error("period must be >= 1");
  const result: Series = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let seedSum = 0;
  let seedCount = 0;
  let prev: number | null = null;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null) continue;

    if (prev === null) {
      seedSum += v;
      seedCount += 1;
      if (seedCount === period) {
        prev = seedSum / period;
        result[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      result[i] = prev;
    }
  }
  return result;
}

/** Wilder's RSI. Returns values in [0, 100]. */
export function rsi(closes: Series, period = 14): Series {
  const result: Series = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;
  for (let i = 0; i <= period; i++) {
    if (closes[i] === null) return result; // don't compute across a data gap
  }

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const delta = (closes[i] as number) - (closes[i - 1] as number);
    if (delta >= 0) gainSum += delta;
    else lossSum -= delta;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  result[period] = rsiFromAverages(avgGain, avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const prevClose = closes[i - 1];
    const close = closes[i];
    if (prevClose === null || close === null) {
      avgGain = avgLoss = 0;
      continue;
    }
    const delta = close - prevClose;
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = rsiFromAverages(avgGain, avgLoss);
  }
  return result;
}

function rsiFromAverages(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface MacdResult {
  macdLine: Series;
  signalLine: Series;
  histogram: Series;
}

/** MACD: fast EMA minus slow EMA, plus a signal EMA of that line. */
export function macd(closes: Series, fast = 12, slow = 26, signal = 9): MacdResult {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine: Series = closes.map((_, i) => {
    const f = emaFast[i];
    const s = emaSlow[i];
    return f !== null && s !== null ? f - s : null;
  });
  const signalLine = ema(macdLine, signal);
  const histogram: Series = macdLine.map((m, i) => {
    const s = signalLine[i];
    return m !== null && s !== null ? m - s : null;
  });
  return { macdLine, signalLine, histogram };
}

function trueRange(candles: OHLCVCandle[], i: number): number {
  const { high, low } = candles[i];
  if (i === 0) return high - low;
  const prevClose = candles[i - 1].close;
  return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
}

/** Average True Range (Wilder's smoothing) — a volatility measure in price units. */
export function atr(candles: OHLCVCandle[], period = 14): Series {
  const result: Series = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  let trSum = 0;
  for (let i = 1; i <= period; i++) trSum += trueRange(candles, i);
  let avg = trSum / period;
  result[period] = avg;

  for (let i = period + 1; i < candles.length; i++) {
    const tr = trueRange(candles, i);
    avg = (avg * (period - 1) + tr) / period;
    result[i] = avg;
  }
  return result;
}

export interface BollingerBandsResult {
  upper: Series;
  middle: Series;
  lower: Series;
}

/** Bollinger Bands: SMA middle band, +/- stdDevMultiplier standard deviations. */
export function bollingerBands(
  closes: Series,
  period = 20,
  stdDevMultiplier = 2
): BollingerBandsResult {
  const middle = sma(closes, period);
  const upper: Series = new Array(closes.length).fill(null);
  const lower: Series = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const mid = middle[i];
    if (mid === null) continue;
    let sumSq = 0;
    let ok = true;
    for (let j = i - period + 1; j <= i; j++) {
      const v = closes[j];
      if (v === null) {
        ok = false;
        break;
      }
      sumSq += (v - mid) ** 2;
    }
    if (!ok) continue;
    const stdDev = Math.sqrt(sumSq / period);
    upper[i] = mid + stdDevMultiplier * stdDev;
    lower[i] = mid - stdDevMultiplier * stdDev;
  }
  return { upper, middle, lower };
}

/**
 * VWAP over the supplied candle window (cumulative, not calendar-day
 * reset). Pass a single session's candles for a textbook daily VWAP;
 * "where data supports it" — returns all-null if the provider didn't
 * supply volume.
 */
export function vwap(candles: OHLCVCandle[]): Series {
  const result: Series = new Array(candles.length).fill(null);
  let cumulativePV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < candles.length; i++) {
    const volume = candles[i].volume;
    if (volume === null || volume === undefined) continue;
    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    cumulativePV += typicalPrice * volume;
    cumulativeVolume += volume;
    result[i] = cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : null;
  }
  return result;
}

/** Simple moving average of volume. `null` wherever the provider gave no volume. */
export function averageVolume(candles: OHLCVCandle[], period = 20): Series {
  return sma(
    candles.map((c) => c.volume),
    period
  );
}

/** Current volume divided by its trailing average — >1 means above-average activity. */
export function relativeVolume(candles: OHLCVCandle[], period = 20): Series {
  const avg = averageVolume(candles, period);
  return candles.map((c, i) => {
    const a = avg[i];
    if (a === null || a === 0 || c.volume === null) return null;
    return c.volume / a;
  });
}

/** Rate-of-change momentum, as a percentage over `period` candles. */
export function momentum(closes: Series, period = 10): Series {
  const result: Series = new Array(closes.length).fill(null);
  for (let i = period; i < closes.length; i++) {
    const prev = closes[i - period];
    const cur = closes[i];
    if (prev === null || cur === null || prev === 0) continue;
    result[i] = ((cur - prev) / prev) * 100;
  }
  return result;
}

export interface AdxResult {
  plusDI: Series;
  minusDI: Series;
  adx: Series;
}

/**
 * Average Directional Index (Wilder's) — measures trend *strength*
 * regardless of direction; +DI/-DI indicate which direction is
 * dominant. ADX above ~25 is conventionally read as "trending" and
 * below ~20 as "range-bound," though this module doesn't hard-code that
 * judgment — see scoring.ts for how it's used.
 */
export function adx(candles: OHLCVCandle[], period = 14): AdxResult {
  const n = candles.length;
  const plusDI: Series = new Array(n).fill(null);
  const minusDI: Series = new Array(n).fill(null);
  const adxSeries: Series = new Array(n).fill(null);
  if (n <= period * 2) return { plusDI, minusDI, adx: adxSeries };

  const plusDM: number[] = new Array(n).fill(0);
  const minusDM: number[] = new Array(n).fill(0);
  const tr: number[] = new Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    tr[i] = trueRange(candles, i);
  }

  let smoothedTR = 0;
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;
  for (let i = 1; i <= period; i++) {
    smoothedTR += tr[i];
    smoothedPlusDM += plusDM[i];
    smoothedMinusDM += minusDM[i];
  }

  const dx: Series = new Array(n).fill(null);

  function recordDI(i: number) {
    const pDI = smoothedTR === 0 ? 0 : (100 * smoothedPlusDM) / smoothedTR;
    const mDI = smoothedTR === 0 ? 0 : (100 * smoothedMinusDM) / smoothedTR;
    plusDI[i] = pDI;
    minusDI[i] = mDI;
    const sum = pDI + mDI;
    dx[i] = sum === 0 ? 0 : (100 * Math.abs(pDI - mDI)) / sum;
  }

  recordDI(period);

  for (let i = period + 1; i < n; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + tr[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDM[i];
    recordDI(i);
  }

  // ADX itself is a Wilder-smoothed average of DX, starting once `period`
  // DX values exist (i.e. at index 2*period).
  let dxSum = 0;
  for (let i = period; i < period * 2; i++) dxSum += dx[i] as number;
  let avgDx = dxSum / period;
  adxSeries[period * 2 - 1] = avgDx;

  for (let i = period * 2; i < n; i++) {
    avgDx = (avgDx * (period - 1) + (dx[i] as number)) / period;
    adxSeries[i] = avgDx;
  }

  return { plusDI, minusDI, adx: adxSeries };
}

/** Convenience: the last non-null value in a series, or null if none. */
export function lastValue(series: Series): number | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] !== null) return series[i];
  }
  return null;
}
