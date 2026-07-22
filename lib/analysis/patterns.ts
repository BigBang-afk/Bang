import type { DetectedPattern, PixelCandle } from "./types";
import {
  bodyBottom,
  bodyRatio,
  bodySize,
  bodyTop,
  isBearish,
  isBullish,
  lowerWick,
  precedingTrendBias,
  range,
  upperWick,
} from "./candleMath";

function clampStrength(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function detectDoji(candles: PixelCandle[], i: number): DetectedPattern | null {
  const c = candles[i];
  if (bodyRatio(c) > 0.12) return null;
  return {
    name: "Doji",
    direction: "neutral",
    strength: clampStrength(70 - bodyRatio(c) * 400),
    atIndex: i,
    description: "Tiny body vs. range — indecision between buyers and sellers.",
  };
}

/** Hammer / Hanging Man / Inverted Hammer / Shooting Star / generic pin bar,
 * distinguished by which wick dominates and the preceding trend. */
function detectPinShapes(
  candles: PixelCandle[],
  i: number,
): DetectedPattern | null {
  const c = candles[i];
  const body = bodySize(c);
  const upper = upperWick(c);
  const lower = lowerWick(c);
  const r = range(c);
  if (body > r * 0.35) return null;

  const trend = precedingTrendBias(candles, i);

  if (lower >= body * 2 && lower > upper * 2) {
    const strength = clampStrength(50 + (lower / r) * 60);
    if (trend === "down") {
      return {
        name: "Hammer",
        direction: "bullish",
        strength,
        atIndex: i,
        description:
          "Long lower wick rejecting lower prices after a downtrend — potential bullish reversal.",
      };
    }
    if (trend === "up") {
      return {
        name: "Hanging Man",
        direction: "bearish",
        strength: clampStrength(strength * 0.85),
        atIndex: i,
        description:
          "Long lower wick after an uptrend — possible exhaustion of buyers.",
      };
    }
    return {
      name: "Bullish Pin Bar",
      direction: "bullish",
      strength: clampStrength(strength * 0.8),
      atIndex: i,
      description: "Long lower wick rejecting lower prices.",
    };
  }

  if (upper >= body * 2 && upper > lower * 2) {
    const strength = clampStrength(50 + (upper / r) * 60);
    if (trend === "up") {
      return {
        name: "Shooting Star",
        direction: "bearish",
        strength,
        atIndex: i,
        description:
          "Long upper wick rejecting higher prices after an uptrend — potential bearish reversal.",
      };
    }
    if (trend === "down") {
      return {
        name: "Inverted Hammer",
        direction: "bullish",
        strength: clampStrength(strength * 0.85),
        atIndex: i,
        description:
          "Long upper wick after a downtrend — early sign buyers are stepping in.",
      };
    }
    return {
      name: "Bearish Pin Bar",
      direction: "bearish",
      strength: clampStrength(strength * 0.8),
      atIndex: i,
      description: "Long upper wick rejecting higher prices.",
    };
  }

  return null;
}

function detectMarubozu(candles: PixelCandle[], i: number): DetectedPattern | null {
  const c = candles[i];
  if (bodyRatio(c) < 0.9) return null;
  const direction = isBullish(c) ? "bullish" : "bearish";
  return {
    name: isBullish(c) ? "Bullish Marubozu" : "Bearish Marubozu",
    direction,
    strength: clampStrength(60 + bodyRatio(c) * 40),
    atIndex: i,
    description:
      "Full-bodied candle with almost no wicks — strong one-sided momentum.",
  };
}

function detectEngulfing(candles: PixelCandle[], i: number): DetectedPattern | null {
  if (i < 1) return null;
  const prev = candles[i - 1];
  const cur = candles[i];

  const prevTop = bodyTop(prev);
  const prevBottom = bodyBottom(prev);
  const curTop = bodyTop(cur);
  const curBottom = bodyBottom(cur);
  const engulfs = curTop <= prevTop && curBottom >= prevBottom;
  if (!engulfs || bodySize(prev) === 0) return null;

  const sizeRatio = bodySize(cur) / Math.max(bodySize(prev), 1);

  if (isBearish(prev) && isBullish(cur)) {
    return {
      name: "Bullish Engulfing",
      direction: "bullish",
      strength: clampStrength(45 + sizeRatio * 15),
      atIndex: i,
      description: "Bullish body fully engulfs the prior bearish candle.",
    };
  }
  if (isBullish(prev) && isBearish(cur)) {
    return {
      name: "Bearish Engulfing",
      direction: "bearish",
      strength: clampStrength(45 + sizeRatio * 15),
      atIndex: i,
      description: "Bearish body fully engulfs the prior bullish candle.",
    };
  }
  return null;
}

function detectHarami(candles: PixelCandle[], i: number): DetectedPattern | null {
  if (i < 1) return null;
  const prev = candles[i - 1];
  const cur = candles[i];
  if (bodySize(prev) === 0) return null;

  const inside = bodyTop(cur) >= bodyTop(prev) && bodyBottom(cur) <= bodyBottom(prev);
  if (!inside) return null;
  if (bodySize(cur) > bodySize(prev) * 0.6) return null;

  if (isBearish(prev) && isBullish(cur)) {
    return {
      name: "Bullish Harami",
      direction: "bullish",
      strength: 55,
      atIndex: i,
      description: "Small bullish body inside the prior large bearish body — momentum stalling.",
    };
  }
  if (isBullish(prev) && isBearish(cur)) {
    return {
      name: "Bearish Harami",
      direction: "bearish",
      strength: 55,
      atIndex: i,
      description: "Small bearish body inside the prior large bullish body — momentum stalling.",
    };
  }
  return null;
}

function detectPiercingOrDarkCloud(
  candles: PixelCandle[],
  i: number,
): DetectedPattern | null {
  if (i < 1) return null;
  const prev = candles[i - 1];
  const cur = candles[i];
  const prevMid = (bodyTop(prev) + bodyBottom(prev)) / 2;
  if (bodySize(prev) === 0) return null;

  if (isBearish(prev) && isBullish(cur)) {
    const opensBelow = cur.openY >= prev.closeY;
    const closesAboveMid = cur.closeY < prevMid && cur.closeY > bodyTop(prev);
    if (opensBelow && closesAboveMid) {
      return {
        name: "Piercing Line",
        direction: "bullish",
        strength: 60,
        atIndex: i,
        description:
          "Opens below the prior close but recovers past the midpoint of the prior bearish body.",
      };
    }
  }
  if (isBullish(prev) && isBearish(cur)) {
    const opensAbove = cur.openY <= prev.closeY;
    const closesBelowMid = cur.closeY > prevMid && cur.closeY < bodyBottom(prev);
    if (opensAbove && closesBelowMid) {
      return {
        name: "Dark Cloud Cover",
        direction: "bearish",
        strength: 60,
        atIndex: i,
        description:
          "Opens above the prior close but falls past the midpoint of the prior bullish body.",
      };
    }
  }
  return null;
}

function detectStar(candles: PixelCandle[], i: number): DetectedPattern | null {
  if (i < 2) return null;
  const first = candles[i - 2];
  const middle = candles[i - 1];
  const last = candles[i];

  const middleSmall = bodyRatio(middle) < 0.35;
  if (!middleSmall) return null;

  if (isBearish(first) && bodySize(first) > 0 && isBullish(last)) {
    const gapsDown = bodyTop(middle) >= bodyBottom(first) * 0.98;
    const closesIntoFirst = last.closeY < (bodyTop(first) + bodyBottom(first)) / 2;
    if (gapsDown && closesIntoFirst) {
      return {
        name: "Morning Star",
        direction: "bullish",
        strength: 72,
        atIndex: i,
        description:
          "Three-candle bottoming pattern: large bearish candle, indecision, then a strong bullish close back into the first body.",
      };
    }
  }

  if (isBullish(first) && bodySize(first) > 0 && isBearish(last)) {
    const gapsUp = bodyBottom(middle) <= bodyTop(first) * 1.02;
    const closesIntoFirst = last.closeY > (bodyTop(first) + bodyBottom(first)) / 2;
    if (gapsUp && closesIntoFirst) {
      return {
        name: "Evening Star",
        direction: "bearish",
        strength: 72,
        atIndex: i,
        description:
          "Three-candle topping pattern: large bullish candle, indecision, then a strong bearish close back into the first body.",
      };
    }
  }

  return null;
}

function detectThreeInARow(candles: PixelCandle[], i: number): DetectedPattern | null {
  if (i < 2) return null;
  const a = candles[i - 2];
  const b = candles[i - 1];
  const c = candles[i];

  const allBullish = isBullish(a) && isBullish(b) && isBullish(c);
  const allBearish = isBearish(a) && isBearish(b) && isBearish(c);
  const decentBodies = [a, b, c].every((x) => bodyRatio(x) > 0.5);

  if (allBullish && decentBodies && c.closeY < b.closeY && b.closeY < a.closeY) {
    return {
      name: "Three White Soldiers",
      direction: "bullish",
      strength: 78,
      atIndex: i,
      description: "Three consecutive strong bullish candles, each closing higher.",
    };
  }
  if (allBearish && decentBodies && c.closeY > b.closeY && b.closeY > a.closeY) {
    return {
      name: "Three Black Crows",
      direction: "bearish",
      strength: 78,
      atIndex: i,
      description: "Three consecutive strong bearish candles, each closing lower.",
    };
  }
  return null;
}

const DETECTORS = [
  detectDoji,
  detectPinShapes,
  detectMarubozu,
  detectEngulfing,
  detectHarami,
  detectPiercingOrDarkCloud,
  detectStar,
  detectThreeInARow,
];

/** Scans the most recent `lookback` candles (default: last 5) for pattern
 * matches, since those are what matter for a fresh signal. */
export function detectPatterns(
  candles: PixelCandle[],
  lookback = 5,
): DetectedPattern[] {
  const results: DetectedPattern[] = [];
  const start = Math.max(0, candles.length - lookback);

  for (let i = start; i < candles.length; i++) {
    for (const detector of DETECTORS) {
      const match = detector(candles, i);
      if (match) results.push(match);
    }
  }

  return results;
}
