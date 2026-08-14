/**
 * No-repaint guardrails. "Repainting" is when an indicator's historical
 * value changes retroactively because it was computed using a candle that
 * hadn't closed yet — this module exists so that never happens here.
 *
 * The rule enforced everywhere in this package: every indicator and every
 * scanner/scoring calculation runs on CLOSED candles only. The
 * currently-forming candle (if the provider's response includes it) is
 * split off and, at most, used to show the live/current price — never fed
 * into an indicator calculation.
 */

import type { OHLCVCandle } from "@/lib/market-data/types";
import type { Timeframe } from "@/lib/market-data/types";

const TIMEFRAME_DURATION_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export interface SplitCandles {
  /** Fully closed candles, oldest first — safe to feed into indicators. */
  closed: OHLCVCandle[];
  /**
   * The currently-forming candle, if the input included one (its close
   * time is still in the future). Use only to display "current price" —
   * never for indicator math, or values would repaint as the candle
   * continues to form.
   */
  forming: OHLCVCandle | null;
}

/**
 * Splits a series of candles (ascending by time, as returned by
 * lib/market-data) into closed vs. still-forming, based on the
 * timeframe's duration. A candle is "closed" once its open time plus one
 * full timeframe duration has passed.
 *
 * @param now Injectable for tests; defaults to the real current time.
 */
export function splitClosedAndForming(
  candles: OHLCVCandle[],
  timeframe: Timeframe,
  now: Date = new Date()
): SplitCandles {
  if (candles.length === 0) return { closed: [], forming: null };

  const durationSeconds = TIMEFRAME_DURATION_MS[timeframe] / 1000;
  const nowSeconds = now.getTime() / 1000;

  const last = candles[candles.length - 1];
  const lastCloseTime = last.time + durationSeconds;

  if (lastCloseTime > nowSeconds) {
    return { closed: candles.slice(0, -1), forming: last };
  }
  return { closed: candles, forming: null };
}
