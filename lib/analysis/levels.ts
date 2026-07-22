import type { LevelContext, PixelCandle, SRLevel } from "./types";

interface PivotOptions {
  left: number;
  right: number;
  maxLevels: number;
  mergeTolerance: number;
  touchTolerance: number;
}

const DEFAULTS: PivotOptions = {
  left: 2,
  right: 2,
  maxLevels: 8,
  mergeTolerance: 0.012,
  touchTolerance: 0.01,
};

function visibleRange(candles: PixelCandle[]): number {
  const highs = candles.map((c) => c.highY);
  const lows = candles.map((c) => c.lowY);
  return Math.max(1, Math.max(...lows) - Math.min(...highs));
}

interface RawPivot {
  y: number;
  index: number;
  isResistance: boolean;
}

function findPivots(candles: PixelCandle[], left: number, right: number): RawPivot[] {
  const pivots: RawPivot[] = [];

  for (let k = left; k < candles.length - right; k++) {
    let isPivotHigh = true;
    let isPivotLow = true;

    for (let j = k - left; j <= k + right; j++) {
      if (j === k) continue;
      if (candles[j].highY <= candles[k].highY) isPivotHigh = false;
      if (candles[j].lowY >= candles[k].lowY) isPivotLow = false;
    }

    if (isPivotHigh) pivots.push({ y: candles[k].highY, index: k, isResistance: true });
    if (isPivotLow) pivots.push({ y: candles[k].lowY, index: k, isResistance: false });
  }

  return pivots;
}

function scoreLevel(touches: number): number {
  return Math.min(100, touches * 20);
}

export function buildLevels(
  candles: PixelCandle[],
  options: Partial<PivotOptions> = {},
): LevelContext {
  const opts = { ...DEFAULTS, ...options };

  if (candles.length < opts.left + opts.right + 1) {
    return {
      levels: [],
      nearestSupport: null,
      nearestResistance: null,
      distanceToSupportPct: null,
      distanceToResistancePct: null,
    };
  }

  const range = visibleRange(candles);
  const mergeTol = range * opts.mergeTolerance;
  const touchTol = range * opts.touchTolerance;

  const pivots = findPivots(candles, opts.left, opts.right);

  const levels: SRLevel[] = [];
  for (const pivot of pivots) {
    const existing = levels.find(
      (lvl) => lvl.isResistance === pivot.isResistance && Math.abs(lvl.priceY - pivot.y) <= mergeTol,
    );
    if (existing) {
      existing.priceY = (existing.priceY * existing.touches + pivot.y) / (existing.touches + 1);
      existing.touches += 1;
      existing.lastIndex = pivot.index;
      existing.score = scoreLevel(existing.touches);
    } else {
      levels.push({
        priceY: pivot.y,
        isResistance: pivot.isResistance,
        touches: 1,
        score: scoreLevel(1),
        firstIndex: pivot.index,
        lastIndex: pivot.index,
      });
    }
  }

  // Also count "touches" from any candle wick coming within tolerance of a
  // level, even without forming its own pivot — this captures reactive
  // price memory around a level.
  for (const level of levels) {
    let extraTouches = 0;
    for (const c of candles) {
      const wickPoint = level.isResistance ? c.highY : c.lowY;
      if (Math.abs(wickPoint - level.priceY) <= touchTol) extraTouches++;
    }
    level.touches = Math.max(level.touches, Math.min(extraTouches, 8));
    level.score = scoreLevel(level.touches);
  }

  levels.sort((a, b) => b.score - a.score);
  const trimmed = levels.slice(0, opts.maxLevels);

  const lastClose = candles[candles.length - 1].closeY;

  const supports = trimmed.filter((l) => !l.isResistance && l.priceY > lastClose);
  const resistances = trimmed.filter((l) => l.isResistance && l.priceY < lastClose);

  const nearestSupport =
    supports.sort((a, b) => a.priceY - lastClose - (b.priceY - lastClose))[0] ?? null;
  const nearestResistance =
    resistances.sort((a, b) => lastClose - a.priceY - (lastClose - b.priceY))[0] ?? null;

  const distanceToSupportPct = nearestSupport
    ? ((nearestSupport.priceY - lastClose) / range) * 100
    : null;
  const distanceToResistancePct = nearestResistance
    ? ((lastClose - nearestResistance.priceY) / range) * 100
    : null;

  return {
    levels: trimmed,
    nearestSupport,
    nearestResistance,
    distanceToSupportPct,
    distanceToResistancePct,
  };
}
