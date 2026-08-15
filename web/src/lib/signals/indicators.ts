// Pure, allocation-light technical indicator math. Every function returns an
// array the same length as its input, with `NaN` for indices still in the
// warm-up period so callers can align indicators to candles by index.

export function sma(values: number[], period: number): number[] {
  const out = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out = new Array(values.length).fill(NaN);
  const k = 2 / (period + 1);
  let prev: number | undefined;
  for (let i = 0; i < values.length; i++) {
    if (i === period - 1) {
      const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      prev = seed;
      out[i] = seed;
    } else if (i >= period && prev !== undefined) {
      const next = values[i] * k + prev * (1 - k);
      out[i] = next;
      prev = next;
    }
  }
  return out;
}

export function rsi(closes: number[], period = 14): number[] {
  const out = new Array(closes.length).fill(NaN);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        out[i] = rsiFromAverages(avgGain, avgLoss);
      }
      continue;
    }

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = rsiFromAverages(avgGain, avgLoss);
  }
  return out;
}

function rsiFromAverages(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface MacdResult {
  line: number[];
  signal: number[];
  histogram: number[];
}

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const line = closes.map((_, i) =>
    Number.isNaN(emaFast[i]) || Number.isNaN(emaSlow[i]) ? NaN : emaFast[i] - emaSlow[i],
  );

  // EMA of the MACD line, skipping leading NaNs.
  const firstValid = line.findIndex((v) => !Number.isNaN(v));
  const signal = new Array(line.length).fill(NaN);
  if (firstValid >= 0) {
    const compact = line.slice(firstValid);
    const compactSignal = ema(compact, signalPeriod);
    for (let i = 0; i < compactSignal.length; i++) {
      signal[firstValid + i] = compactSignal[i];
    }
  }

  const histogram = line.map((v, i) => (Number.isNaN(v) || Number.isNaN(signal[i]) ? NaN : v - signal[i]));
  return { line, signal, histogram };
}

export interface BollingerResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function bollinger(closes: number[], period = 20, mult = 2): BollingerResult {
  const middle = sma(closes, period);
  const upper = new Array(closes.length).fill(NaN);
  const lower = new Array(closes.length).fill(NaN);

  for (let i = period - 1; i < closes.length; i++) {
    const window = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    upper[i] = mean + mult * stdDev;
    lower[i] = mean - mult * stdDev;
  }

  return { upper, middle, lower };
}

export function atr(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const trueRanges: number[] = new Array(highs.length).fill(NaN);
  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      trueRanges[i] = highs[i] - lows[i];
      continue;
    }
    trueRanges[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    );
  }

  const out = new Array(highs.length).fill(NaN);
  let prev: number | undefined;
  for (let i = 0; i < trueRanges.length; i++) {
    if (i === period - 1) {
      const seed = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
      prev = seed;
      out[i] = seed;
    } else if (i >= period && prev !== undefined) {
      const next = (prev * (period - 1) + trueRanges[i]) / period;
      out[i] = next;
      prev = next;
    }
  }
  return out;
}

export interface Pivot {
  index: number;
  price: number;
  /** Bar index at which this pivot becomes knowable (index + rightBars). */
  confirmedAt: number;
}

/**
 * Finds ALL swing highs/lows in one O(n) pass using a simple
 * N-bar-left/N-bar-right pivot check (mirrors the pivot logic from the
 * project's Pine Script indicator). Each pivot records the bar index at
 * which it becomes confirmed, so callers doing a walk-forward backtest can
 * filter to `confirmedAt <= i` instead of re-scanning per index.
 */
export function findAllPivots(highs: number[], lows: number[], leftBars = 4, rightBars = 4) {
  const pivotHighs: Pivot[] = [];
  const pivotLows: Pivot[] = [];

  for (let i = leftBars; i < highs.length - rightBars; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j === i) continue;
      if (highs[j] > highs[i]) isHigh = false;
      if (lows[j] < lows[i]) isLow = false;
    }
    if (isHigh) pivotHighs.push({ index: i, price: highs[i], confirmedAt: i + rightBars });
    if (isLow) pivotLows.push({ index: i, price: lows[i], confirmedAt: i + rightBars });
  }

  return { pivotHighs, pivotLows };
}

/** Most recent pivots visible/confirmed by (i.e. at or before) `uptoIndex`. */
export function visiblePivots(pivots: Pivot[], uptoIndex: number, take = 3): Pivot[] {
  const visible = pivots.filter((p) => p.confirmedAt <= uptoIndex);
  return visible.slice(-take);
}
