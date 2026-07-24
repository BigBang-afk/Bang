// Ported from backend/app/services/indicators.py. Operates on parallel arrays of OHLCV
// candles (ascending time order) since this runs in a Vercel serverless function with
// no pandas/numpy — plain arrays keep it dependency-free.

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function ema(values: number[], period: number): number[] {
  return ewmAlpha(values, 2 / (period + 1));
}

function ewmAlpha(values: number[], alpha: number): number[] {
  const out: number[] = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : alpha * values[i] + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}

function diff(values: number[]): number[] {
  const out: number[] = [NaN];
  for (let i = 1; i < values.length; i++) out.push(values[i] - values[i - 1]);
  return out;
}

export function rsi(values: number[], period = 14): number[] {
  const delta = diff(values);
  const gain = delta.map((d) => (isNaN(d) ? 0 : Math.max(d, 0)));
  const loss = delta.map((d) => (isNaN(d) ? 0 : Math.max(-d, 0)));
  const avgGain = ewmAlpha(gain, 1 / period);
  const avgLoss = ewmAlpha(loss, 1 / period);

  return avgGain.map((g, i) => {
    const l = avgLoss[i];
    if (l === 0 && g === 0) return 50;
    if (l === 0) return 100;
    const rs = g / l;
    return 100 - 100 / (1 + rs);
  });
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = emaFast.map((f, i) => f - emaSlow[i]);
  const signalLine = ema(macdLine, signal);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);
  return { macd: macdLine, signal: signalLine, histogram };
}

export function stochasticRsi(values: number[], rsiPeriod = 14, stochPeriod = 14, smoothK = 3, smoothD = 3) {
  const rsiSeries = rsi(values, rsiPeriod);
  const k: number[] = [];
  for (let i = 0; i < rsiSeries.length; i++) {
    const start = Math.max(0, i - stochPeriod + 1);
    const window = rsiSeries.slice(start, i + 1);
    const lo = Math.min(...window);
    const hi = Math.max(...window);
    k.push(hi === lo ? 50 : ((rsiSeries[i] - lo) / (hi - lo)) * 100);
  }
  const smoothedK = rollingMean(k, smoothK);
  const smoothedD = rollingMean(smoothedK, smoothD);
  return { k: smoothedK, d: smoothedD };
}

function rollingMean(values: number[], period: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - period + 1);
    const window = values.slice(start, i + 1);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });
}

export function trueRange(candles: Candle[]): number[] {
  return candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });
}

export function atr(candles: Candle[], period = 14): number[] {
  return ewmAlpha(trueRange(candles), 1 / period);
}

export function adx(candles: Candle[], period = 14) {
  const plusDm: number[] = [0];
  const minusDm: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDm.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  const tr = trueRange(candles);
  const atrSmooth = ewmAlpha(tr, 1 / period).map((v) => (v === 0 ? NaN : v));
  const plusDi = ewmAlpha(plusDm, 1 / period).map((v, i) => (100 * v) / (atrSmooth[i] || NaN) || 0);
  const minusDi = ewmAlpha(minusDm, 1 / period).map((v, i) => (100 * v) / (atrSmooth[i] || NaN) || 0);
  const dx = plusDi.map((p, i) => {
    const m = minusDi[i];
    const sum = p + m;
    return sum === 0 ? 0 : (Math.abs(p - m) / sum) * 100;
  });
  const adxSeries = ewmAlpha(dx, 1 / period);
  return { adx: adxSeries, plusDi, minusDi };
}

export function vwap(candles: Candle[]): number[] {
  let cumPv = 0;
  let cumVol = 0;
  const out: number[] = [];
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    cumPv += typical * c.volume;
    cumVol += c.volume;
    out.push(cumVol === 0 ? typical : cumPv / cumVol);
  }
  return out;
}

export function relativeVolume(candles: Candle[], period = 20): number[] {
  return candles.map((c, i) => {
    const start = Math.max(0, i - period + 1);
    const window = candles.slice(start, i + 1).map((x) => x.volume);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    return avg === 0 ? 1 : c.volume / avg;
  });
}

export type Trend = "bullish" | "bearish" | "ranging";

export function trendDirection(price: number, emaFast: number, emaSlow: number): Trend {
  if (price > emaFast && emaFast > emaSlow) return "bullish";
  if (price < emaFast && emaFast < emaSlow) return "bearish";
  return "ranging";
}

export interface IndicatorSnapshot {
  ema: { ema20: number; ema50: number; ema100: number; ema200: number };
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  stochRsi: { k: number; d: number };
  atr: number;
  adx: { adx: number; plusDi: number; minusDi: number };
  vwap: number;
  relativeVolume: number;
  shortTermTrend: Trend;
  longTermTrend: Trend;
  trendStrength: number;
}

export function computeAllIndicators(candles: Candle[]): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const last = <T>(arr: T[]) => arr[arr.length - 1];

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema100 = ema(closes, 100);
  const ema200 = ema(closes, 200);
  const macdData = macd(closes);
  const stochRsiData = stochasticRsi(closes);
  const adxData = adx(candles);
  const price = last(closes);

  return {
    ema: { ema20: last(ema20), ema50: last(ema50), ema100: last(ema100), ema200: last(ema200) },
    rsi: last(rsi(closes)),
    macd: { macd: last(macdData.macd), signal: last(macdData.signal), histogram: last(macdData.histogram) },
    stochRsi: { k: last(stochRsiData.k), d: last(stochRsiData.d) },
    atr: last(atr(candles)),
    adx: { adx: last(adxData.adx), plusDi: last(adxData.plusDi), minusDi: last(adxData.minusDi) },
    vwap: last(vwap(candles)),
    relativeVolume: last(relativeVolume(candles)),
    shortTermTrend: trendDirection(price, last(ema20), last(ema50)),
    longTermTrend: trendDirection(price, last(ema50), last(ema200)),
    trendStrength: last(adxData.adx),
  };
}
