import type { DetectedPattern, PixelCandle } from "./types";
import { bodyBottom, bodyTop } from "./candleMath";

/**
 * Literal implementations of three "sure shot" / "magic" patterns supplied
 * by the user (screenshots of signal-seller marketing graphics). These are
 * implemented exactly as diagrammed — no extra trust weight is given just
 * because the source calls them "sure shot" or "magic". Each one is also
 * measured standalone in the backtester so its real hit rate is visible,
 * separate from the blended engine signal.
 */

const STRATEGY_STRENGTH = 70;

/** "Sure Shot" — a run of 3+ same-color candles, then a breakout candle
 * whose entire body clears the recent local high/low (not just a wick),
 * predicting the candle right after the breakout continues the same way. */
function detectSureShotBreakout(candles: PixelCandle[]): DetectedPattern | null {
  const n = candles.length;
  if (n < 5) return null;

  const breakout = candles[n - 1];
  const streakColor = candles[n - 2].color;
  if (breakout.color !== streakColor) return null;

  let streakLen = 0;
  for (let i = n - 2; i >= 0; i--) {
    if (candles[i].color === streakColor) streakLen++;
    else break;
  }
  if (streakLen < 3) return null;

  // Reference level: the local high/low reached in the most recent part of
  // the streak (where the diagram draws its horizontal line), using at
  // most the last 3 candles of the streak so an old start doesn't dominate.
  const refCandles = candles.slice(Math.max(0, n - 1 - Math.min(streakLen, 3)), n - 1);

  if (streakColor === "bullish") {
    const level = Math.min(...refCandles.map((c) => bodyTop(c)));
    if (bodyBottom(breakout) >= level) return null; // body hasn't fully cleared the line
    return {
      name: "Sure Shot Breakout (UP)",
      direction: "bullish",
      strength: STRATEGY_STRENGTH,
      atIndex: n - 1,
      description: `${streakLen}-candle bullish run, then a breakout candle whose full body cleared the recent high — rule predicts continuation on the next candle.`,
    };
  } else {
    const level = Math.max(...refCandles.map((c) => bodyBottom(c)));
    if (bodyTop(breakout) <= level) return null;
    return {
      name: "Sure Shot Breakout (DOWN)",
      direction: "bearish",
      strength: STRATEGY_STRENGTH,
      atIndex: n - 1,
      description: `${streakLen}-candle bearish run, then a breakout candle whose full body cleared the recent low — rule predicts continuation on the next candle.`,
    };
  }
}

/** "Magic V Pattern" — a decline (2+ bearish candles) followed by a recovery
 * (1+ bullish candles) that breaks back above the level set just before the
 * decline began (a V shape), or the mirror (an inverted-V / "Λ"). The rule
 * says: whatever color the candle right after that breakout turns out to
 * be, the candle after THAT is predicted to match it. */
function detectMagicV(candles: PixelCandle[]): DetectedPattern | null {
  const n = candles.length;
  if (n < 6) return null;

  const confirmation = candles[n - 1];
  const breakout = candles[n - 2];

  // Bullish V: decline then recovery, breakout closes back above the
  // pre-decline reference level.
  {
    let i = n - 3;
    let recoveryLen = 0;
    while (i >= 0 && candles[i].color === "bullish") {
      recoveryLen++;
      i--;
    }
    let declineLen = 0;
    while (i >= 0 && candles[i].color === "bearish") {
      declineLen++;
      i--;
    }
    const refIndex = i;
    if (recoveryLen >= 1 && declineLen >= 2 && refIndex >= 0) {
      const refLevel = candles[refIndex].closeY;
      if (breakout.color === "bullish" && bodyBottom(breakout) < refLevel) {
        const direction = confirmation.color === "bullish" ? "bullish" : "bearish";
        return {
          name: "Magic V Pattern",
          direction,
          strength: STRATEGY_STRENGTH,
          atIndex: n - 1,
          description: `V-shaped reversal breakout confirmed; rule predicts the next candle matches the confirmation candle's color (${confirmation.color}).`,
        };
      }
    }
  }

  // Mirror: inverted-V (incline then pullback breaking back below the
  // pre-incline reference level).
  {
    let i = n - 3;
    let pullbackLen = 0;
    while (i >= 0 && candles[i].color === "bearish") {
      pullbackLen++;
      i--;
    }
    let inclineLen = 0;
    while (i >= 0 && candles[i].color === "bullish") {
      inclineLen++;
      i--;
    }
    const refIndex = i;
    if (pullbackLen >= 1 && inclineLen >= 2 && refIndex >= 0) {
      const refLevel = candles[refIndex].closeY;
      if (breakout.color === "bearish" && bodyTop(breakout) > refLevel) {
        const direction = confirmation.color === "bullish" ? "bullish" : "bearish";
        return {
          name: "Magic ∧ Pattern",
          direction,
          strength: STRATEGY_STRENGTH,
          atIndex: n - 1,
          description: `Inverted V-shaped reversal breakout confirmed; rule predicts the next candle matches the confirmation candle's color (${confirmation.color}).`,
        };
      }
    }
  }

  return null;
}

/** "5-Min Level Breakout" — treats the most recent completed block of 5
 * one-minute candles as a synthetic 5-minute candle, and trades a 1-minute
 * body breakout of that block's high/low as a continuation signal. */
function detectFiveMinLevelBreakout(candles: PixelCandle[]): DetectedPattern | null {
  const n = candles.length;
  if (n < 7) return null;

  const last = candles[n - 1];
  const block = candles.slice(n - 6, n - 1); // 5 candles just before the last one
  const blockHighY = Math.min(...block.map((c) => c.highY));
  const blockLowY = Math.max(...block.map((c) => c.lowY));

  if (bodyBottom(last) < blockHighY) {
    return {
      name: "5-Min Level Breakout (UP)",
      direction: "bullish",
      strength: STRATEGY_STRENGTH,
      atIndex: n - 1,
      description:
        "Full body closed beyond the high of the prior 5-candle block (treated as a synthetic 5-minute candle) — rule predicts continuation.",
    };
  }
  if (bodyTop(last) > blockLowY) {
    return {
      name: "5-Min Level Breakout (DOWN)",
      direction: "bearish",
      strength: STRATEGY_STRENGTH,
      atIndex: n - 1,
      description:
        "Full body closed beyond the low of the prior 5-candle block (treated as a synthetic 5-minute candle) — rule predicts continuation.",
    };
  }

  return null;
}

export const NAMED_STRATEGY_DETECTORS = [
  detectSureShotBreakout,
  detectMagicV,
  detectFiveMinLevelBreakout,
];

export function detectNamedStrategies(candles: PixelCandle[]): DetectedPattern[] {
  const results: DetectedPattern[] = [];
  for (const detector of NAMED_STRATEGY_DETECTORS) {
    const match = detector(candles);
    if (match) results.push(match);
  }
  return results;
}
