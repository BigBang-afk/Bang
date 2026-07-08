import { Direction, ExpiryKey, Pair } from "@/lib/types";
import { generateCandles } from "@/lib/candles/generator";
import { EXPIRY_TIMEFRAME_SECONDS } from "./signalEngine";

/**
 * Because live candles come from the deterministic synthetic generator, the
 * "actual" outcome of a past signal can be replayed exactly by regenerating
 * the entry/expiry candles for that same pair/timeframe/timestamp.
 */
export function settleOutcome(
  pair: Pair,
  expiry: ExpiryKey,
  direction: Direction,
  entryTimeSeconds: number,
  expiryTimeSeconds: number
): "WIN" | "LOSS" {
  const timeframe = EXPIRY_TIMEFRAME_SECONDS[expiry];
  const candles = generateCandles(pair, timeframe, 4, expiryTimeSeconds + timeframe);

  const entryCandle = candles.find((c) => c.time === entryTimeSeconds) ?? candles[0];
  const expiryCandle =
    candles.find((c) => c.time === expiryTimeSeconds) ?? candles[candles.length - 1];

  if (direction === "CALL") {
    return expiryCandle.close > entryCandle.close ? "WIN" : "LOSS";
  }
  return expiryCandle.close < entryCandle.close ? "WIN" : "LOSS";
}
