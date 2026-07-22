import type {
  LevelContext,
  PixelCandle,
  ProjectedCandle,
  SignalDirection,
  TrendContext,
} from "./types";
import { bodyBottom, bodySize, bodyTop, lowerWick, upperWick } from "./candleMath";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Builds an illustrative 2-candle continuation of the existing signal.
 * This is the same trend/level/confidence read already computed, drawn
 * forward as candle shapes — not a separate or more reliable forecast.
 * Confidence decays further from the last real candle, and a projected
 * move is clamped (and turned into a "reaction" shape) if it would run
 * straight through a nearby strong support/resistance level. */
export function buildProjection(
  candles: PixelCandle[],
  levels: LevelContext,
  trend: TrendContext,
  signal: SignalDirection,
  confidence: number,
): ProjectedCandle[] {
  if (candles.length < 3) return [];

  const tail = candles.slice(-10);
  const last = candles[candles.length - 1];

  const avgSpacing = average(
    tail.slice(1).map((c, i) => c.xCenter - tail[i].xCenter),
  ) || last.xEnd - last.xStart + 2;
  const candleWidth = last.xEnd - last.xStart + 1;
  const avgBody = average(tail.map(bodySize)) || 1;
  const avgUpperWick = average(tail.map(upperWick));
  const avgLowerWick = average(tail.map(lowerWick));

  // 50% confidence -> a timid ~0.35x average candle. ~92% (our cap) -> ~1.3x.
  const sizeMultiplier = Math.max(0.3, Math.min(1.4, 0.35 + ((confidence - 50) / 42) * 0.95));

  const direction = signal === "CALL" ? -1 : signal === "PUT" ? 1 : 0;

  function makeCandle(
    index: number,
    xCenter: number,
    openY: number,
    move: number,
    wickScale: number,
    note: string,
  ): ProjectedCandle {
    const closeY = openY + move;
    const color = closeY <= openY ? "bullish" : "bearish";
    const top = Math.min(openY, closeY);
    const bottom = Math.max(openY, closeY);
    const highY = top - avgUpperWick * wickScale;
    const lowY = bottom + avgLowerWick * wickScale;

    return {
      index,
      xStart: xCenter - candleWidth / 2,
      xEnd: xCenter + candleWidth / 2,
      xCenter,
      color,
      highY,
      lowY,
      bodyTopY: top,
      bodyBottomY: bottom,
      openY: color === "bullish" ? bottom : top,
      closeY: color === "bullish" ? top : bottom,
      note,
    };
  }

  if (direction === 0) {
    // WAIT: sketch mild indecision, not a directional move. Direction of the
    // first wobble is derived from existing data (not random) so the same
    // chart always produces the same projection.
    const wobble = avgBody * 0.25;
    const wobbleSign = last.color === "bullish" ? -1 : 1;
    const c1 = makeCandle(
      last.index + 1,
      last.xCenter + avgSpacing,
      last.closeY,
      wobble * wobbleSign,
      0.7,
      "Signals were mixed on this scan, so no directional move is projected here — just illustrative chop.",
    );
    const c2 = makeCandle(
      last.index + 2,
      last.xCenter + avgSpacing * 2,
      c1.closeY,
      wobble * (c1.color === "bullish" ? 1 : -1),
      0.7,
      "Still no clear edge — treat both projected candles as a placeholder, not a forecast.",
    );
    return [c1, c2];
  }

  let move1 = direction * avgBody * sizeMultiplier;
  let note1 = `Sketches the ${signal} read forward: continuation in the signaled direction, sized off recent candle range and ${confidence}% confidence.`;

  // Clamp if this move would blow straight through the nearest level in that direction.
  const targetLevel = direction < 0 ? levels.nearestResistance : levels.nearestSupport;
  let reactionExpected = false;
  if (targetLevel) {
    const distanceToLevel = direction < 0 ? last.closeY - targetLevel.priceY : targetLevel.priceY - last.closeY;
    if (distanceToLevel > 0 && Math.abs(move1) > distanceToLevel * 0.8) {
      move1 = direction * distanceToLevel * 0.7;
      reactionExpected = true;
      note1 = `Move is capped before the nearby ${direction < 0 ? "resistance" : "support"} level (score ${Math.round(targetLevel.score)}%) instead of projecting straight through it.`;
    }
  }

  const candle1 = makeCandle(last.index + 1, last.xCenter + avgSpacing, last.closeY, move1, 1, note1);

  let move2: number;
  let note2: string;
  if (reactionExpected) {
    // Likely reaction/pullback at the level rather than blind continuation.
    move2 = -direction * avgBody * 0.35;
    note2 = "A small pullback is sketched here since price is projected to meet a level — real reactions at levels are common but far from guaranteed.";
  } else {
    move2 = direction * avgBody * sizeMultiplier * 0.55;
    note2 = "Second candle is dampened further — confidence in a specific move naturally fades the further out you project.";
  }

  const candle2 = makeCandle(last.index + 2, last.xCenter + avgSpacing * 2, candle1.closeY, move2, 0.85, note2);

  return [candle1, candle2];
}
