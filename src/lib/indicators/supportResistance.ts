import { Candle } from "@/lib/types";

export interface SwingLevels {
  support: number[];
  resistance: number[];
}

/** Simple fractal pivot detection: a swing high/low relative to `arm` neighbors on each side. */
export function findSwingLevels(candles: Candle[], arm = 2): SwingLevels {
  const support: number[] = [];
  const resistance: number[] = [];

  for (let i = arm; i < candles.length - arm; i++) {
    const window = candles.slice(i - arm, i + arm + 1);
    const isHigh = window.every((c) => c.high <= candles[i].high);
    const isLow = window.every((c) => c.low >= candles[i].low);
    if (isHigh) resistance.push(candles[i].high);
    if (isLow) support.push(candles[i].low);
  }

  return { support, resistance };
}

export function nearestLevel(price: number, levels: number[]): number | null {
  if (levels.length === 0) return null;
  return levels.reduce((closest, lvl) =>
    Math.abs(lvl - price) < Math.abs(closest - price) ? lvl : closest
  );
}

export function distancePct(price: number, level: number): number {
  return Math.abs(price - level) / price;
}
