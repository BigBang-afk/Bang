import { Candle } from "@/lib/types";
import { ema } from "@/lib/indicators/movingAverage";
import { rsi as rsiSeries } from "@/lib/indicators/rsi";
import { macd as macdSeries } from "@/lib/indicators/macd";
import { bollingerBands } from "@/lib/indicators/bollinger";
import { atr as atrSeries } from "@/lib/indicators/atr";
import { findSwingLevels, nearestLevel, distancePct } from "@/lib/indicators/supportResistance";
import {
  candlePressure,
  wickRejectionScore,
  breakout,
  breakoutRetest,
  liquiditySweep,
  momentumCandle,
  candleOverpowersPrevious,
} from "@/lib/indicators/candlePatterns";

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

export interface ConditionScores {
  trend: number; // -1 (bearish) .. +1 (bullish)
  emaAlignment: number;
  rsi: number;
  macd: number;
  candlePressure: number;
  wickRejection: number;
  supportResistance: number;
  volatilityQuality: number; // 0 (choppy/flat) .. 1 (clean directional volatility), non-directional
  meta: {
    ema5: number;
    ema20: number;
    ema50: number;
    rsiValue: number;
    macdHistogram: number;
    price: number;
    trendLabel: string;
    pressureLabel: string;
    nearestSupport: number | null;
    nearestResistance: number | null;
    breakoutDir: "bullish" | "bearish" | "none";
    retestDir: "bullish" | "bearish" | "none";
    sweepDir: "bullish" | "bearish" | "none";
    momentumDir: "bullish" | "bearish" | "none";
    overpowerDir: "bullish" | "bearish" | "none";
  };
}

export function computeConditionScores(full: Candle[], recentWindow: Candle[]): ConditionScores {
  const closes = full.map((c) => c.close);
  const price = closes[closes.length - 1];

  const ema5Series = ema(closes, 5);
  const ema20Series = ema(closes, 20);
  const ema50Series = ema(closes, 50);
  const ema5 = ema5Series[ema5Series.length - 1];
  const ema20 = ema20Series[ema20Series.length - 1];
  const ema50 = ema50Series[ema50Series.length - 1];

  const rsiVals = rsiSeries(closes, 14);
  const rsiValue = rsiVals[rsiVals.length - 1];

  const macdRes = macdSeries(closes);
  const macdHistogram = macdRes.histogram[macdRes.histogram.length - 1];
  const macdLine = macdRes.macd[macdRes.macd.length - 1];
  const signalLine = macdRes.signal[macdRes.signal.length - 1];

  const bb = bollingerBands(closes, 20, 2);
  const bandwidth = bb.bandwidth[bb.bandwidth.length - 1];
  const validBandwidths = bb.bandwidth.filter((v) => !Number.isNaN(v));
  const avgBandwidth =
    validBandwidths.length > 0
      ? validBandwidths.reduce((a, b) => a + b, 0) / validBandwidths.length
      : bandwidth;

  const atrVals = atrSeries(full, 14);
  const atrValue = atrVals[atrVals.length - 1];
  const validAtr = atrVals.filter((v) => !Number.isNaN(v));
  const avgAtr =
    validAtr.length > 0 ? validAtr.reduce((a, b) => a + b, 0) / validAtr.length : atrValue;

  const { support, resistance } = findSwingLevels(full.slice(-Math.min(full.length, 120)), 2);
  const nearestSupport = nearestLevel(price, support);
  const nearestResistance = nearestLevel(price, resistance);

  // --- Trend direction ---
  let trend = 0;
  if (!Number.isNaN(ema50)) {
    trend += clamp((price - ema50) / (ema50 * 0.004));
  }
  const brk = breakout(recentWindow, Math.min(10, recentWindow.length - 1));
  const retest = breakoutRetest(full.slice(-30), 10);
  if (brk === "bullish") trend += 0.4;
  if (brk === "bearish") trend -= 0.4;
  if (retest === "bullish") trend += 0.3;
  if (retest === "bearish") trend -= 0.3;
  trend = clamp(trend);

  // --- EMA alignment ---
  let emaAlignment = 0;
  if (!Number.isNaN(ema5) && !Number.isNaN(ema20)) {
    emaAlignment += ema5 > ema20 ? 1 : -1;
  }
  if (!Number.isNaN(ema20) && !Number.isNaN(ema50)) {
    emaAlignment += ema20 > ema50 ? 1 : -1;
  }
  if (!Number.isNaN(ema5) && !Number.isNaN(ema50)) {
    emaAlignment += ema5 > ema50 ? 1 : -1;
  }
  emaAlignment = clamp(emaAlignment / 3);

  // --- RSI confirmation ---
  const rsiScore = Number.isNaN(rsiValue) ? 0 : clamp((rsiValue - 50) / 25);

  // --- MACD confirmation ---
  let macdScore = 0;
  if (!Number.isNaN(macdHistogram)) {
    const scale = Math.abs(macdLine) > 0 ? Math.abs(macdLine) * 1.5 + 1e-9 : 1e-6;
    macdScore = clamp(macdHistogram / scale);
  }
  if (!Number.isNaN(macdLine) && !Number.isNaN(signalLine)) {
    macdScore = clamp(macdScore + (macdLine > signalLine ? 0.2 : -0.2));
  }

  // --- Candle pressure ---
  const pressureValue = candlePressure(recentWindow);
  const momentumDir = momentumCandle(
    recentWindow[recentWindow.length - 1],
    recentWindow[recentWindow.length - 2] ?? recentWindow[recentWindow.length - 1]
  );
  const overpowerDir = candleOverpowersPrevious(
    recentWindow[recentWindow.length - 1],
    recentWindow[recentWindow.length - 2] ?? recentWindow[recentWindow.length - 1]
  );
  let candlePressureScore = pressureValue;
  if (momentumDir === "bullish") candlePressureScore += 0.15;
  if (momentumDir === "bearish") candlePressureScore -= 0.15;
  if (overpowerDir === "bullish") candlePressureScore += 0.15;
  if (overpowerDir === "bearish") candlePressureScore -= 0.15;
  candlePressureScore = clamp(candlePressureScore);

  // --- Wick rejection ---
  const wickWindow = recentWindow.slice(-3);
  const wickScore = clamp(
    wickWindow.reduce((acc, c) => acc + wickRejectionScore(c), 0) / wickWindow.length
  );

  // --- Support / resistance reaction ---
  let srScore = 0;
  if (nearestSupport !== null && distancePct(price, nearestSupport) < 0.0015) {
    srScore += 0.6;
  }
  if (nearestResistance !== null && distancePct(price, nearestResistance) < 0.0015) {
    srScore -= 0.6;
  }
  const sweepDir = liquiditySweep(recentWindow, Math.min(10, recentWindow.length - 1));
  if (sweepDir === "bullish") srScore += 0.4;
  if (sweepDir === "bearish") srScore -= 0.4;
  srScore = clamp(srScore);

  // --- Volatility quality (non-directional, 0..1) ---
  let volatilityQuality = 0.5;
  if (!Number.isNaN(bandwidth) && avgBandwidth > 0) {
    const relBandwidth = bandwidth / avgBandwidth;
    volatilityQuality = clamp(relBandwidth > 0.6 && relBandwidth < 1.8 ? 0.85 : 0.35, 0, 1);
  }
  if (!Number.isNaN(atrValue) && avgAtr > 0) {
    const relAtr = atrValue / avgAtr;
    if (relAtr < 0.4) volatilityQuality = Math.min(volatilityQuality, 0.3);
  }

  const trendLabel = Number.isNaN(ema50)
    ? "Ranging"
    : trend > 0.15
      ? "Uptrend"
      : trend < -0.15
        ? "Downtrend"
        : "Sideways / Ranging";

  const absPressure = Math.abs(pressureValue);
  const pressureLabel =
    absPressure > 0.6
      ? pressureValue > 0
        ? "Strong Bullish Pressure"
        : "Strong Bearish Pressure"
      : absPressure > 0.25
        ? pressureValue > 0
          ? "Mild Bullish Pressure"
          : "Mild Bearish Pressure"
        : "Neutral Pressure";

  return {
    trend,
    emaAlignment,
    rsi: rsiScore,
    macd: macdScore,
    candlePressure: candlePressureScore,
    wickRejection: wickScore,
    supportResistance: srScore,
    volatilityQuality,
    meta: {
      ema5,
      ema20,
      ema50,
      rsiValue,
      macdHistogram,
      price,
      trendLabel,
      pressureLabel,
      nearestSupport,
      nearestResistance,
      breakoutDir: brk,
      retestDir: retest,
      sweepDir,
      momentumDir,
      overpowerDir,
    },
  };
}
