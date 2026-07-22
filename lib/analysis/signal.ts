import type {
  AnalysisResult,
  DetectedPattern,
  LevelContext,
  PixelCandle,
  SignalDirection,
  SignalFactor,
  TrendContext,
} from "./types";

const PROXIMITY_THRESHOLD_PCT = 10;
const MIN_LEVEL_SCORE = 35;
const WAIT_THRESHOLD = 10;
const MAX_CONFIDENCE = 92;
const MIN_DIRECTIONAL_CONFIDENCE = 54;

function patternFactors(patterns: DetectedPattern[], candleCount: number): SignalFactor[] {
  return patterns.map((p) => {
    const recency = candleCount - 1 - p.atIndex;
    const recencyMultiplier = Math.max(0.55, 1 - recency * 0.15);
    const weight = p.direction === "neutral" ? 0 : (p.strength / 100) * 22 * recencyMultiplier;

    return {
      label: p.name,
      direction: p.direction,
      weight: Number(weight.toFixed(1)),
      detail: p.description,
    };
  });
}

function levelFactors(levels: LevelContext): SignalFactor[] {
  const factors: SignalFactor[] = [];

  if (
    levels.nearestSupport &&
    levels.distanceToSupportPct !== null &&
    levels.distanceToSupportPct <= PROXIMITY_THRESHOLD_PCT &&
    levels.nearestSupport.score >= MIN_LEVEL_SCORE
  ) {
    const proximity = 1 - levels.distanceToSupportPct / PROXIMITY_THRESHOLD_PCT;
    factors.push({
      label: "Price near support",
      direction: "bullish",
      weight: Number((levels.nearestSupport.score * 0.16 * (0.5 + proximity)).toFixed(1)),
      detail: `Support level touched ${levels.nearestSupport.touches}x, ${levels.distanceToSupportPct.toFixed(1)}% away.`,
    });
  }

  if (
    levels.nearestResistance &&
    levels.distanceToResistancePct !== null &&
    levels.distanceToResistancePct <= PROXIMITY_THRESHOLD_PCT &&
    levels.nearestResistance.score >= MIN_LEVEL_SCORE
  ) {
    const proximity = 1 - levels.distanceToResistancePct / PROXIMITY_THRESHOLD_PCT;
    factors.push({
      label: "Price near resistance",
      direction: "bearish",
      weight: Number((levels.nearestResistance.score * 0.16 * (0.5 + proximity)).toFixed(1)),
      detail: `Resistance level touched ${levels.nearestResistance.touches}x, ${levels.distanceToResistancePct.toFixed(1)}% away.`,
    });
  }

  return factors;
}

function trendFactors(trend: TrendContext): SignalFactor[] {
  const factors: SignalFactor[] = [];

  if (trend.slopeDirection !== "neutral") {
    factors.push({
      label: "Short-term trend",
      direction: trend.slopeDirection,
      weight: 12,
      detail: `5-candle average is ${trend.slopeDirection === "bullish" ? "above" : "below"} the 14-candle average.`,
    });

    if (trend.bodyMomentum === "expanding") {
      factors.push({
        label: "Momentum expanding",
        direction: trend.slopeDirection,
        weight: 7,
        detail: "Recent candle bodies are growing in the trend direction.",
      });
    }
  }

  if (trend.streak.length >= 3) {
    factors.push({
      label: `${trend.streak.length}-candle streak`,
      direction: trend.streak.color === "bullish" ? "bullish" : "bearish",
      weight: Math.min(12, (trend.streak.length - 2) * 4),
      detail: `${trend.streak.length} consecutive ${trend.streak.color} candles.`,
    });
  }

  return factors;
}

function confluenceFactors(base: SignalFactor[]): SignalFactor[] {
  const hasBullishPattern = base.some(
    (f) => f.direction === "bullish" && f.label !== "Price near support",
  );
  const hasBearishPattern = base.some(
    (f) => f.direction === "bearish" && f.label !== "Price near resistance",
  );
  const nearSupport = base.some((f) => f.label === "Price near support");
  const nearResistance = base.some((f) => f.label === "Price near resistance");

  const factors: SignalFactor[] = [];
  if (hasBullishPattern && nearSupport) {
    factors.push({
      label: "Pattern + support confluence",
      direction: "bullish",
      weight: 10,
      detail: "A bullish candle pattern is lining up with a support level.",
    });
  }
  if (hasBearishPattern && nearResistance) {
    factors.push({
      label: "Pattern + resistance confluence",
      direction: "bearish",
      weight: 10,
      detail: "A bearish candle pattern is lining up with a resistance level.",
    });
  }
  return factors;
}

export function buildSignal(
  candles: PixelCandle[],
  patterns: DetectedPattern[],
  levels: LevelContext,
  trend: TrendContext,
): { factors: SignalFactor[]; signal: SignalDirection; confidence: number } {
  const factors: SignalFactor[] = [
    ...patternFactors(patterns, candles.length),
    ...levelFactors(levels),
    ...trendFactors(trend),
  ];
  factors.push(...confluenceFactors(factors));

  const hasIndecision = patterns.some((p) => p.direction === "neutral");

  const netScore = factors.reduce((sum, f) => {
    if (f.direction === "bullish") return sum + f.weight;
    if (f.direction === "bearish") return sum - f.weight;
    return sum;
  }, 0);

  let signal: SignalDirection = "WAIT";
  if (netScore >= WAIT_THRESHOLD) signal = "CALL";
  else if (netScore <= -WAIT_THRESHOLD) signal = "PUT";

  let confidence: number;
  if (signal === "WAIT") {
    confidence = Math.round(50 + Math.min(4, Math.abs(netScore) * 0.4));
  } else {
    const raw = 50 + Math.abs(netScore) * 0.85;
    const dampened = hasIndecision ? raw - 6 : raw;
    confidence = Math.round(
      Math.max(MIN_DIRECTIONAL_CONFIDENCE, Math.min(MAX_CONFIDENCE, dampened)),
    );
  }

  return { factors, signal, confidence };
}
