import {
  Candle,
  Direction,
  ExpiryKey,
  GeneratedSignal,
  Pair,
  RiskLevel,
  SignalStrength,
} from "@/lib/types";
import { generateCandles, currentCandleBoundaries } from "@/lib/candles/generator";
import { computeConditionScores } from "./conditions";
import { scoreConditions } from "./scorer";
import { buildReason } from "./reason";
import { SCALP_WEIGHTS, TREND_WEIGHTS } from "./weights";
import { hashString } from "@/lib/candles/rng";

export const EXPIRY_TIMEFRAME_SECONDS: Record<ExpiryKey, number> = {
  "15s": 5,
  "1m": 60,
};

export const EXPIRY_FETCH_COUNT: Record<ExpiryKey, number> = {
  "15s": 10,
  "1m": 40,
};

const CONTEXT_CANDLES = 120; // enough history for EMA50/RSI14/MACD/BB20 to stabilize

function classifyStrength(confidence: number): SignalStrength {
  if (confidence >= 85) return "Strong";
  if (confidence >= 75) return "Good";
  if (confidence >= 65) return "Normal";
  return "Risky";
}

function classifyRisk(strength: SignalStrength): RiskLevel {
  if (strength === "Strong") return "Low";
  if (strength === "Risky") return "High";
  return "Medium";
}

export function generateSignalFromCandles(
  pair: Pair,
  expiry: ExpiryKey,
  full: Candle[],
  entryTime: number,
  expiryTime: number
): GeneratedSignal {
  const recentCount = Math.min(EXPIRY_FETCH_COUNT[expiry], full.length);
  const recentWindow = full.slice(-recentCount);
  const weights = expiry === "15s" ? SCALP_WEIGHTS : TREND_WEIGHTS;

  const scores = computeConditionScores(full, recentWindow);
  const { callScore, putScore, callBreakdown, putBreakdown } = scoreConditions(scores, weights);

  let direction: Direction;
  const diff = callScore - putScore;

  if (Math.abs(diff) < 1e-6) {
    // Tie: fall back to stronger candle pressure, then a stable per-signal hash
    // so we still always emit a direction and never "NO TRADE".
    if (Math.abs(scores.candlePressure) > 1e-6) {
      direction = scores.candlePressure > 0 ? "CALL" : "PUT";
    } else {
      direction = hashString(`${pair}|${expiry}|${entryTime}`) % 2 === 0 ? "CALL" : "PUT";
    }
  } else {
    direction = diff > 0 ? "CALL" : "PUT";
  }

  const rawConfidence = direction === "CALL" ? callScore : putScore;
  const confidence = Math.round(Math.min(99, Math.max(55, rawConfidence)));

  const signalStrength = classifyStrength(confidence);
  const riskLevel = classifyRisk(signalStrength);
  const reason = buildReason(direction, scores);

  return {
    pair,
    expiry,
    direction,
    confidence,
    signalStrength,
    riskLevel,
    trendDirection: scores.meta.trendLabel,
    candlePressure: scores.meta.pressureLabel,
    reason,
    entryTime,
    expiryTime,
    callScore,
    putScore,
    breakdownCall: callBreakdown,
    breakdownPut: putBreakdown,
  };
}

export function generateLiveSignal(
  pair: Pair,
  expiry: ExpiryKey,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): GeneratedSignal {
  const timeframe = EXPIRY_TIMEFRAME_SECONDS[expiry];
  const fetchCount = EXPIRY_FETCH_COUNT[expiry] + CONTEXT_CANDLES;
  const full = generateCandles(pair, timeframe, fetchCount, nowSeconds);
  const { entryTime, expiryTime } = currentCandleBoundaries(timeframe, nowSeconds);
  return generateSignalFromCandles(pair, expiry, full, entryTime, expiryTime);
}
