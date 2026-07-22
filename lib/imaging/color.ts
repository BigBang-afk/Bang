export interface Hsv {
  h: number;
  s: number;
  v: number;
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

export type PixelClass = "bullish" | "bearish" | "none";

/** Classifies a pixel as part of a bullish (green) candle, bearish (red)
 * candle, or neither (background, grid, text, UI chrome). Tuned to be
 * broad enough to cover common charting color themes (TradingView/Quotex
 * style greens and reds) while excluding desaturated backgrounds. */
export function classifyPixel(r: number, g: number, b: number): PixelClass {
  const { h, s, v } = rgbToHsv(r, g, b);

  if (s < 0.25 || v < 0.15) return "none";

  if (h >= 70 && h <= 175) return "bullish";
  if (h <= 20 || h >= 340) return "bearish";

  return "none";
}
