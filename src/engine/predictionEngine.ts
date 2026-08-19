import type { Candle, Prediction } from "../types";
import { atr, clamp, ema, findSwingLevels, last, macd, rsi, sma } from "./indicators";

const MIN_CANDLES = 55;

interface FactorScores {
  trend: number;
  momentum: number;
  pattern: number;
  supportResistance: number;
  volume: number;
}

function trendScore(closes: number[]): number {
  const ema9 = last(ema(closes, 9));
  const ema21 = last(ema(closes, 21));
  const ema50 = last(ema(closes, 50));
  let score = 0;
  score += ema9 > ema21 ? 0.5 : -0.5;
  score += ema21 > ema50 ? 0.5 : -0.5;
  return clamp(score, -1, 1);
}

function momentumScore(closes: number[], atrLast: number): number {
  const rsiVal = last(rsi(closes, 14));
  const rsiScore = Number.isFinite(rsiVal) ? clamp((rsiVal - 50) / 25, -1, 1) : 0;

  const { histogram } = macd(closes, 12, 26, 9);
  const histVal = last(histogram);
  const macdScore = atrLast > 0 && Number.isFinite(histVal) ? clamp((histVal / atrLast) * 2, -1, 1) : 0;

  return clamp((rsiScore + macdScore) / 2, -1, 1);
}

function patternScore(candles: Candle[]): number {
  const c = last(candles);
  const prev = candles[candles.length - 2];
  const range = c.high - c.low || 1e-9;
  const body = Math.abs(c.close - c.open);
  const upperWick = c.high - Math.max(c.close, c.open);
  const lowerWick = Math.min(c.close, c.open) - c.low;

  if (prev) {
    const prevBody = Math.abs(prev.close - prev.open);
    const prevBullish = prev.close > prev.open;
    const currBullish = c.close > c.open;
    const engulfs = body > prevBody * 1.05 && Math.max(c.close, c.open) >= Math.max(prev.close, prev.open) && Math.min(c.close, c.open) <= Math.min(prev.close, prev.open);
    if (engulfs && !prevBullish && currBullish) return 0.65;
    if (engulfs && prevBullish && !currBullish) return -0.65;
  }

  if (lowerWick > body * 2 && lowerWick > upperWick * 1.5) return 0.45; // hammer / bullish pin bar
  if (upperWick > body * 2 && upperWick > lowerWick * 1.5) return -0.45; // shooting star / bearish pin bar
  if (body / range < 0.1) return 0; // doji — indecision

  return clamp(((c.close - c.open) / range) * 0.35, -0.35, 0.35);
}

function supportResistanceScore(candles: Candle[], close: number, atrLast: number): number {
  const { resistance, support } = findSwingLevels(candles, 3, 100);
  const proximity = atrLast > 0 ? atrLast * 0.6 : close * 0.0015;

  const nearestResistance = resistance.filter((r) => r > close).sort((a, b) => a - b)[0];
  const nearestSupport = support.filter((s) => s < close).sort((a, b) => b - a)[0];

  let score = 0;
  if (nearestResistance !== undefined && nearestResistance - close <= proximity) {
    score -= 0.5;
  }
  if (nearestSupport !== undefined && close - nearestSupport <= proximity) {
    score += 0.5;
  }
  return clamp(score, -1, 1);
}

function volumeScore(candles: Candle[]): number {
  const volumes = candles.map((c) => c.volume);
  if (volumes.every((v) => v === 0)) return 0; // no reliable volume data
  const avgVol = last(sma(volumes, 20));
  const c = last(candles);
  if (!Number.isFinite(avgVol) || avgVol <= 0) return 0;
  if (c.volume < avgVol * 1.3) return 0;
  return c.close >= c.open ? 0.4 : -0.4;
}

function computeFactors(candles: Candle[]): { factors: FactorScores; atrLast: number } {
  const closes = candles.map((c) => c.close);
  const atrLast = last(atr(candles, 14));
  return {
    factors: {
      trend: trendScore(closes),
      momentum: momentumScore(closes, atrLast || 1),
      pattern: patternScore(candles),
      supportResistance: supportResistanceScore(candles, last(closes), atrLast || 0),
      volume: volumeScore(candles),
    },
    atrLast: Number.isFinite(atrLast) ? atrLast : 0,
  };
}

const WEIGHTS: FactorScores = {
  trend: 0.3,
  momentum: 0.25,
  pattern: 0.2,
  supportResistance: 0.15,
  volume: 0.1,
};

function composite(factors: FactorScores): { score: number; agreement: number } {
  const score = clamp(
    factors.trend * WEIGHTS.trend +
      factors.momentum * WEIGHTS.momentum +
      factors.pattern * WEIGHTS.pattern +
      factors.supportResistance * WEIGHTS.supportResistance +
      factors.volume * WEIGHTS.volume,
    -1,
    1,
  );

  const nonZero = Object.values(factors).filter((v) => Math.abs(v) > 0.02);
  const agreeing = nonZero.filter((v) => Math.sign(v) === Math.sign(score || 1));
  const agreement = nonZero.length > 0 ? agreeing.length / nonZero.length : 0.5;

  return { score, agreement };
}

function buildCandle(
  time: number,
  open: number,
  score: number,
  agreement: number,
  atrLast: number,
  confidenceFloor: number,
  confidenceCeil: number,
): Prediction {
  const expectedMove = score * atrLast * 0.6;
  const close = open + expectedMove;
  const direction = close >= open ? "BULLISH" : "BEARISH";
  const wickAllowance = atrLast * 0.25 * (1 - Math.abs(score) * 0.3);

  const high = Math.max(open, close) + Math.max(wickAllowance, 0);
  const low = Math.min(open, close) - Math.max(wickAllowance, 0);

  const confidence = clamp(50 + Math.abs(score) * 30 + agreement * 15, confidenceFloor, confidenceCeil);

  return {
    time,
    direction,
    signal: direction === "BULLISH" ? "CALL" : "PUT",
    confidence: Math.round(confidence),
    open,
    high,
    low,
    close,
    score,
  };
}

/**
 * Prediction Engine.
 *
 * Pure function: given the closed, real historical candles (never the
 * predictions themselves, never randomness), produces exactly two chained
 * forecast candles for the two time slots immediately following
 * `anchorTime`. Deterministic — the same market history always yields the
 * same forecast, so nothing here is randomly generated or hard-coded.
 */
export function generatePredictions(closedCandles: Candle[], anchorTime: number, intervalSeconds: number): [Prediction, Prediction] | null {
  if (closedCandles.length < MIN_CANDLES) return null;

  const { factors, atrLast } = computeFactors(closedCandles);
  const { score, agreement } = composite(factors);
  const anchorClose = last(closedCandles).close;

  const p1 = buildCandle(anchorTime + intervalSeconds, anchorClose, score, agreement, atrLast, 50, 95);

  // Chain candle 2 off candle 1's projected close, decaying conviction to
  // reflect the added uncertainty of forecasting two steps ahead.
  const decayedScore = clamp(score * 0.65 + factors.trend * 0.15, -1, 1);
  const p2 = buildCandle(anchorTime + intervalSeconds * 2, p1.close, decayedScore, agreement, atrLast, 45, 90);
  p2.confidence = Math.min(p2.confidence, p1.confidence - 3);
  p2.confidence = clamp(p2.confidence, 45, 90);

  return [p1, p2];
}
