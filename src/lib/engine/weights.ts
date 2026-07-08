import { SignalScoreBreakdown } from "@/lib/types";

/**
 * Both profiles sum to 100 points total (matches the spec's confidence
 * scoring system). The 15s "scalp" profile deliberately shifts weight away
 * from slower trend/EMA/RSI/MACD signals and into fast candle-reaction
 * categories, per the "avoid slow signals" requirement for micro expiries.
 * The 1m "trend" profile uses the point allocation exactly as specified.
 */
export const TREND_WEIGHTS: SignalScoreBreakdown = {
  trend: 20,
  emaAlignment: 15,
  rsi: 15,
  macd: 10,
  candlePressure: 15,
  wickRejection: 10,
  supportResistance: 10,
  volatilityQuality: 5,
};

export const SCALP_WEIGHTS: SignalScoreBreakdown = {
  trend: 10,
  emaAlignment: 8,
  rsi: 8,
  macd: 5,
  candlePressure: 25,
  wickRejection: 20,
  supportResistance: 19,
  volatilityQuality: 5,
};
