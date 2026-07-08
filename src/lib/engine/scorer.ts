import { SignalScoreBreakdown } from "@/lib/types";
import { ConditionScores } from "./conditions";

export interface ScoreResult {
  callScore: number;
  putScore: number;
  callBreakdown: SignalScoreBreakdown;
  putBreakdown: SignalScoreBreakdown;
}

const DIRECTIONAL_KEYS = [
  "trend",
  "emaAlignment",
  "rsi",
  "macd",
  "candlePressure",
  "wickRejection",
  "supportResistance",
] as const;

/**
 * Splits each category's point pool between CALL and PUT proportionally to
 * how bullish/bearish that category reads. A category that is 100% bullish
 * gives all its points to CALL; a neutral (0) category splits 50/50. The two
 * side-totals always sum to 100, so the winning total doubles as the
 * confidence score before clamping to the 55-99 display range.
 */
export function scoreConditions(
  scores: ConditionScores,
  weights: SignalScoreBreakdown
): ScoreResult {
  const callBreakdown = {} as SignalScoreBreakdown;
  const putBreakdown = {} as SignalScoreBreakdown;

  for (const key of DIRECTIONAL_KEYS) {
    const directional = scores[key]; // -1..1
    const maxPoints = weights[key];
    const callShare = (directional + 1) / 2; // 0..1
    const callPoints = maxPoints * callShare;
    callBreakdown[key] = callPoints;
    putBreakdown[key] = maxPoints - callPoints;
  }

  // Volatility quality is non-directional: it reinforces whichever side is
  // already ahead from the other categories rather than picking a side itself.
  const callSoFar = DIRECTIONAL_KEYS.reduce((acc, k) => acc + callBreakdown[k], 0);
  const putSoFar = DIRECTIONAL_KEYS.reduce((acc, k) => acc + putBreakdown[k], 0);
  const volMax = weights.volatilityQuality;
  const quality = scores.volatilityQuality; // 0..1

  if (callSoFar === putSoFar) {
    callBreakdown.volatilityQuality = volMax / 2;
    putBreakdown.volatilityQuality = volMax / 2;
  } else {
    const leaderIsCall = callSoFar > putSoFar;
    const leaderPoints = volMax * (0.5 + quality * 0.5);
    const laggardPoints = volMax - leaderPoints;
    callBreakdown.volatilityQuality = leaderIsCall ? leaderPoints : laggardPoints;
    putBreakdown.volatilityQuality = leaderIsCall ? laggardPoints : leaderPoints;
  }

  const callScore = Object.values(callBreakdown).reduce((a, b) => a + b, 0);
  const putScore = Object.values(putBreakdown).reduce((a, b) => a + b, 0);

  return { callScore, putScore, callBreakdown, putBreakdown };
}
