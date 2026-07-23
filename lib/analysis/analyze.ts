import { decodeImage, extractCandles } from "../imaging/extractCandles";
import type { AnalysisResult } from "./types";
import { detectPatterns } from "./patterns";
import { buildLevels } from "./levels";
import { buildTrend } from "./trend";
import { buildSignal } from "./signal";
import { buildProjection } from "./projection";
import { detectNamedStrategies } from "./namedStrategies";

export async function analyzeChartImage(buffer: Buffer): Promise<AnalysisResult> {
  const image = await decodeImage(buffer);
  const { candles, warnings } = extractCandles(image);

  if (candles.length === 0) {
    return {
      candleCount: 0,
      candles: [],
      imageWidth: image.width,
      imageHeight: image.height,
      patterns: [],
      levels: {
        levels: [],
        nearestSupport: null,
        nearestResistance: null,
        distanceToSupportPct: null,
        distanceToResistancePct: null,
      },
      trend: {
        shortSma: 0,
        longSma: 0,
        slopeDirection: "neutral",
        streak: { color: "bullish", length: 0 },
        bodyMomentum: "flat",
      },
      factors: [],
      signal: "WAIT",
      confidence: 50,
      projection: [],
      warnings,
    };
  }

  const trimmed = candles.slice(-120);

  const patterns = [...detectPatterns(trimmed, 5), ...detectNamedStrategies(trimmed)];
  const levels = buildLevels(trimmed);
  const trend = buildTrend(trimmed);
  const { factors, signal, confidence } = buildSignal(trimmed, patterns, levels, trend);
  const projection = buildProjection(trimmed, levels, trend, signal, confidence);

  return {
    candleCount: trimmed.length,
    candles: trimmed,
    imageWidth: image.width,
    imageHeight: image.height,
    patterns,
    levels,
    trend,
    factors,
    signal,
    confidence,
    projection,
    warnings,
  };
}
