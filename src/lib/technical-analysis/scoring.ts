/**
 * Transparent technical scoring engine.
 *
 * This module ANALYZES the OHLCV data it's given — it never invents a
 * signal. Every field on TechnicalSnapshot traces back to a specific,
 * inspectable indicator value (see `indicators` on the snapshot), and
 * every entry in supportingConditions/conflictingConditions names the
 * exact rule that fired. There is no black-box "AI says buy" step here.
 *
 * This is decision-support, not a prediction: a high score means several
 * independent technical conditions agree right now, not that price will
 * move in that direction. Callers (the scanner UI) must present it that
 * way — see the risk disclaimer shown on /dashboard/scanner.
 *
 * Only ever called with CLOSED candles (see candles.ts) — never the
 * currently-forming one, so these numbers don't repaint.
 */

import {
  adx,
  atr,
  bollingerBands,
  ema,
  lastValue,
  macd,
  momentum,
  relativeVolume,
  rsi,
} from "@/lib/technical-analysis/indicators";
import type { OHLCVCandle, Timeframe } from "@/lib/market-data/types";

export type Trend = "bullish" | "bearish" | "neutral";
export type Volatility = "low" | "normal" | "high";
export type VolumeState = "above_average" | "average" | "below_average" | "unknown";
export type RiskLevel = "low" | "medium" | "high";

export interface AnalysisSettings {
  emaFastPeriod: number;
  emaSlowPeriod: number;
  rsiPeriod: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  atrPeriod: number;
  bollingerPeriod: number;
  bollingerStdDev: number;
  adxPeriod: number;
  adxTrendThreshold: number;
  volumePeriod: number;
  volumeAboveMultiplier: number;
  volumeBelowMultiplier: number;
  momentumPeriod: number;
  volatilityLowPercent: number;
  volatilityHighPercent: number;
  structureLookback: number;
}

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  emaFastPeriod: 20,
  emaSlowPeriod: 50,
  rsiPeriod: 14,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  atrPeriod: 14,
  bollingerPeriod: 20,
  bollingerStdDev: 2,
  adxPeriod: 14,
  adxTrendThreshold: 25,
  volumePeriod: 20,
  volumeAboveMultiplier: 1.2,
  volumeBelowMultiplier: 0.8,
  momentumPeriod: 10,
  volatilityLowPercent: 1,
  volatilityHighPercent: 3,
  structureLookback: 12,
};

export interface IndicatorReadout {
  emaFast: number | null;
  emaSlow: number | null;
  rsi: number | null;
  macdHistogram: number | null;
  atr: number | null;
  atrPercent: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;
  relativeVolume: number | null;
  momentum: number | null;
}

export interface TechnicalSnapshot {
  symbol: string;
  timeframe: Timeframe;
  /** Unix seconds of the last CLOSED candle this analysis is based on. */
  asOfCandleTime: number;
  /** Close of the last closed candle (see the API layer for live ticker price, kept separate). */
  price: number;
  trend: Trend;
  momentumReading: Trend;
  volatility: Volatility;
  volumeState: VolumeState;
  /** 0-100. See module doc — a measure of confirmation agreement, not a probability. */
  score: number;
  setupType: string | null;
  supportingConditions: string[];
  conflictingConditions: string[];
  riskLevel: RiskLevel;
  indicators: IndicatorReadout;
}

function structureDirection(
  candles: OHLCVCandle[],
  lookback: number
): "up" | "down" | "mixed" {
  const recent = candles.slice(-lookback);
  if (recent.length < 4) return "mixed";
  const mid = Math.floor(recent.length / 2);
  const firstHalf = recent.slice(0, mid);
  const secondHalf = recent.slice(mid);
  const firstHigh = Math.max(...firstHalf.map((c) => c.high));
  const secondHigh = Math.max(...secondHalf.map((c) => c.high));
  const firstLow = Math.min(...firstHalf.map((c) => c.low));
  const secondLow = Math.min(...secondHalf.map((c) => c.low));

  if (secondHigh > firstHigh && secondLow > firstLow) return "up";
  if (secondHigh < firstHigh && secondLow < firstLow) return "down";
  return "mixed";
}

/**
 * Minimum closed candles needed before any of this module's indicators
 * have finished warming up. Callers can use this to skip symbols with too
 * little history rather than getting back a null snapshot.
 */
export function minimumCandlesRequired(settings: AnalysisSettings): number {
  return Math.max(
    settings.emaSlowPeriod,
    settings.adxPeriod * 2 + 1,
    settings.macdSlow + settings.macdSignal,
    settings.bollingerPeriod
  );
}

export function analyzeSymbol(
  closedCandles: OHLCVCandle[],
  symbol: string,
  timeframe: Timeframe,
  settings: AnalysisSettings = DEFAULT_ANALYSIS_SETTINGS
): TechnicalSnapshot | null {
  if (closedCandles.length < minimumCandlesRequired(settings)) return null;

  const closes = closedCandles.map((c) => c.close);
  const lastIndex = closedCandles.length - 1;
  const price = closes[lastIndex];

  const emaFast = lastValue(ema(closes, settings.emaFastPeriod));
  const emaSlow = lastValue(ema(closes, settings.emaSlowPeriod));
  const rsiVal = lastValue(rsi(closes, settings.rsiPeriod));
  const macdResult = macd(closes, settings.macdFast, settings.macdSlow, settings.macdSignal);
  const macdHistogram = lastValue(macdResult.histogram);
  const atrVal = lastValue(atr(closedCandles, settings.atrPeriod));
  const bb = bollingerBands(closes, settings.bollingerPeriod, settings.bollingerStdDev);
  const adxResult = adx(closedCandles, settings.adxPeriod);
  const adxVal = lastValue(adxResult.adx);
  const plusDI = lastValue(adxResult.plusDI);
  const minusDI = lastValue(adxResult.minusDI);
  const relVol = lastValue(relativeVolume(closedCandles, settings.volumePeriod));
  const momentumVal = lastValue(momentum(closes, settings.momentumPeriod));

  if (emaFast === null || emaSlow === null || rsiVal === null || macdHistogram === null) {
    return null;
  }

  const atrPercent = atrVal !== null && price > 0 ? (atrVal / price) * 100 : null;

  // --- Trend -----------------------------------------------------------
  // Strict comparisons on both sides so an exact tie (e.g. flat price
  // action) falls through to "neutral" rather than defaulting to bearish.
  const priceAboveSlowEma = price > emaSlow;
  const fastAboveSlowEma = emaFast > emaSlow;
  const priceBelowSlowEma = price < emaSlow;
  const fastBelowSlowEma = emaFast < emaSlow;
  let trend: Trend = "neutral";
  if (priceAboveSlowEma && fastAboveSlowEma) trend = "bullish";
  else if (priceBelowSlowEma && fastBelowSlowEma) trend = "bearish";

  // --- Momentum ----------------------------------------------------------
  const bullishMomentumSignals = [rsiVal > 50, macdHistogram > 0, (momentumVal ?? 0) > 0];
  const bearishMomentumSignals = [rsiVal < 50, macdHistogram < 0, (momentumVal ?? 0) < 0];
  const bullishMomentumCount = bullishMomentumSignals.filter(Boolean).length;
  const bearishMomentumCount = bearishMomentumSignals.filter(Boolean).length;
  let momentumReading: Trend = "neutral";
  if (bullishMomentumCount >= 2) momentumReading = "bullish";
  else if (bearishMomentumCount >= 2) momentumReading = "bearish";

  // --- Volatility ----------------------------------------------------------
  let volatility: Volatility = "normal";
  if (atrPercent !== null) {
    if (atrPercent < settings.volatilityLowPercent) volatility = "low";
    else if (atrPercent > settings.volatilityHighPercent) volatility = "high";
  }

  // --- Volume ----------------------------------------------------------
  let volumeState: VolumeState = "unknown";
  if (relVol !== null) {
    if (relVol >= settings.volumeAboveMultiplier) volumeState = "above_average";
    else if (relVol <= settings.volumeBelowMultiplier) volumeState = "below_average";
    else volumeState = "average";
  }

  // --- Structure ----------------------------------------------------------
  const structure = structureDirection(closedCandles, settings.structureLookback);

  // --- Transparent scoring -----------------------------------------------
  // Each of these 5 checks is independently inspectable — see
  // supportingConditions/conflictingConditions below for the same list in
  // plain language. Only meaningful when trend isn't neutral; a neutral
  // trend means there's nothing to confirm, so we don't force a score.
  const supportingConditions: string[] = [];
  const conflictingConditions: string[] = [];
  let confirmed = 0;
  const totalChecks = 5;

  if (trend !== "neutral") {
    const trendConfirmed = adxVal !== null && adxVal >= settings.adxTrendThreshold;
    if (trendConfirmed) {
      confirmed++;
      supportingConditions.push(
        `Trend confirmed: ADX ${adxVal!.toFixed(1)} >= ${settings.adxTrendThreshold} (${trend})`
      );
    } else {
      conflictingConditions.push(
        `Trend not confirmed by ADX (${adxVal !== null ? adxVal.toFixed(1) : "n/a"} < ${settings.adxTrendThreshold})`
      );
    }

    const momentumConfirmed = momentumReading === trend;
    if (momentumConfirmed) {
      confirmed++;
      supportingConditions.push(`Momentum agrees with trend (${momentumReading})`);
    } else {
      conflictingConditions.push(
        `Momentum reading (${momentumReading}) doesn't confirm ${trend} trend`
      );
    }

    const volumeConfirmed = volumeState === "above_average";
    if (volumeConfirmed) {
      confirmed++;
      supportingConditions.push(
        `Volume above average (${relVol !== null ? relVol.toFixed(2) : "n/a"}x)`
      );
    } else {
      conflictingConditions.push(
        `Volume not confirming (${volumeState.replace("_", " ")})`
      );
    }

    const structureConfirmed =
      (trend === "bullish" && structure === "up") ||
      (trend === "bearish" && structure === "down");
    if (structureConfirmed) {
      confirmed++;
      supportingConditions.push(`Price structure confirms ${trend} trend (${structure})`);
    } else {
      conflictingConditions.push(`Price structure (${structure}) doesn't confirm ${trend} trend`);
    }

    const volatilityOk = volatility === "normal";
    if (volatilityOk) {
      confirmed++;
      supportingConditions.push("Volatility is in a tradeable range (not extreme)");
    } else {
      conflictingConditions.push(`Volatility is ${volatility} — widen/tighten risk accordingly`);
    }
  } else {
    conflictingConditions.push("No clear trend — EMA and price are not aligned");
  }

  const score = trend === "neutral" ? Math.round((confirmed / totalChecks) * 40) : Math.round((confirmed / totalChecks) * 100);

  let setupType: string | null = null;
  if (trend !== "neutral" && score >= 60) {
    setupType =
      structure === (trend === "bullish" ? "up" : "down")
        ? `Trend continuation (${trend})`
        : `Momentum setup (${trend})`;
  }

  let riskLevel: RiskLevel;
  if (volatility === "high") riskLevel = "high";
  else if (score >= 60) riskLevel = "low";
  else if (score >= 40) riskLevel = "medium";
  else riskLevel = "high";

  return {
    symbol,
    timeframe,
    asOfCandleTime: closedCandles[lastIndex].time,
    price,
    trend,
    momentumReading,
    volatility,
    volumeState,
    score,
    setupType,
    supportingConditions,
    conflictingConditions,
    riskLevel,
    indicators: {
      emaFast,
      emaSlow,
      rsi: rsiVal,
      macdHistogram,
      atr: atrVal,
      atrPercent,
      bollingerUpper: lastValue(bb.upper),
      bollingerMiddle: lastValue(bb.middle),
      bollingerLower: lastValue(bb.lower),
      adx: adxVal,
      plusDI,
      minusDI,
      relativeVolume: relVol,
      momentum: momentumVal,
    },
  };
}
