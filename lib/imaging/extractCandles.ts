import sharp from "sharp";
import { classifyPixel } from "./color";
import type { CandleColor, PixelCandle } from "../analysis/types";

export interface DecodedImage {
  width: number;
  height: number;
  /** RGBA pixel buffer, 4 bytes per pixel, row-major */
  data: Buffer;
}

const MAX_WIDTH = 1600;

export async function decodeImage(input: Buffer): Promise<DecodedImage> {
  const pipeline = sharp(input).rotate();
  const meta = await pipeline.metadata();

  const resized =
    meta.width && meta.width > MAX_WIDTH
      ? pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true })
      : pipeline;

  const { data, info } = await resized
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { width: info.width, height: info.height, data };
}

interface ColumnStats {
  bullish: number;
  bearish: number;
  total: number;
}

function classifyColumns(image: DecodedImage): ColumnStats[] {
  const { width, height, data } = image;
  const columns: ColumnStats[] = new Array(width);

  for (let x = 0; x < width; x++) {
    let bullish = 0;
    let bearish = 0;
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      const cls = classifyPixel(data[idx], data[idx + 1], data[idx + 2]);
      if (cls === "bullish") bullish++;
      else if (cls === "bearish") bearish++;
    }
    columns[x] = { bullish, bearish, total: bullish + bearish };
  }

  return columns;
}

interface Block {
  xStart: number;
  xEnd: number;
}

function findBlocks(columns: ColumnStats[]): Block[] {
  const blocks: Block[] = [];
  let start = -1;

  for (let x = 0; x < columns.length; x++) {
    const active = columns[x].total > 0;
    if (active && start === -1) {
      start = x;
    } else if (!active && start !== -1) {
      blocks.push({ xStart: start, xEnd: x - 1 });
      start = -1;
    }
  }
  if (start !== -1) blocks.push({ xStart: start, xEnd: columns.length - 1 });

  return blocks;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

const BODY_ROW_FILL_RATIO = 0.55;

export interface ExtractionResult {
  candles: PixelCandle[];
  warnings: string[];
}

export function extractCandles(image: DecodedImage): ExtractionResult {
  const warnings: string[] = [];
  const { width, height, data } = image;

  const columns = classifyColumns(image);
  const rawBlocks = findBlocks(columns);

  if (rawBlocks.length < 5) {
    return {
      candles: [],
      warnings: [
        "Could not detect enough candles in this image. Try cropping the screenshot so it shows only the candlestick chart area (no toolbars/buttons).",
      ],
    };
  }

  const widths = rawBlocks.map((b) => b.xEnd - b.xStart + 1);
  const widthMedian = median(widths);
  const blocks = rawBlocks.filter((b) => {
    const w = b.xEnd - b.xStart + 1;
    return w <= widthMedian * 2.5 && w >= widthMedian * 0.3;
  });

  const dropped = rawBlocks.length - blocks.length;
  if (dropped > 0) {
    warnings.push(
      `Ignored ${dropped} region(s) that didn't look like candles (likely UI elements).`,
    );
  }

  if (blocks.length < 5) {
    return {
      candles: [],
      warnings: [
        "Could not reliably isolate the candlestick series. Try cropping the screenshot so it shows only the candlestick chart area.",
      ],
    };
  }

  const candles: PixelCandle[] = blocks.map((block, index) => {
    const blockWidth = block.xEnd - block.xStart + 1;

    let bullishTotal = 0;
    let bearishTotal = 0;
    let highY = height;
    let lowY = -1;

    const rowWidth = new Array<number>(height).fill(0);
    const rowIsBullish = new Array<number>(height).fill(0);
    const rowIsBearish = new Array<number>(height).fill(0);

    for (let x = block.xStart; x <= block.xEnd; x++) {
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        const cls = classifyPixel(data[idx], data[idx + 1], data[idx + 2]);
        if (cls === "none") continue;

        rowWidth[y]++;
        if (cls === "bullish") {
          bullishTotal++;
          rowIsBullish[y]++;
        } else {
          bearishTotal++;
          rowIsBearish[y]++;
        }

        if (y < highY) highY = y;
        if (y > lowY) lowY = y;
      }
    }

    const color: CandleColor =
      bullishTotal >= bearishTotal ? "bullish" : "bearish";

    let bodyTopY = -1;
    let bodyBottomY = -1;
    const bodyThreshold = blockWidth * BODY_ROW_FILL_RATIO;
    for (let y = highY; y <= lowY; y++) {
      if (rowWidth[y] >= bodyThreshold) {
        if (bodyTopY === -1) bodyTopY = y;
        bodyBottomY = y;
      }
    }

    // Fallback for very thin bodies (doji-like): use the widest rows.
    if (bodyTopY === -1) {
      const maxWidth = Math.max(...rowWidth.slice(highY, lowY + 1), 1);
      const relaxedThreshold = Math.max(1, maxWidth * 0.6);
      for (let y = highY; y <= lowY; y++) {
        if (rowWidth[y] >= relaxedThreshold) {
          if (bodyTopY === -1) bodyTopY = y;
          bodyBottomY = y;
        }
      }
    }
    if (bodyTopY === -1) {
      bodyTopY = Math.round((highY + lowY) / 2);
      bodyBottomY = bodyTopY;
    }

    const openY = color === "bullish" ? bodyBottomY : bodyTopY;
    const closeY = color === "bullish" ? bodyTopY : bodyBottomY;

    return {
      index,
      xStart: block.xStart,
      xEnd: block.xEnd,
      xCenter: (block.xStart + block.xEnd) / 2,
      color,
      highY,
      lowY,
      bodyTopY,
      bodyBottomY,
      openY,
      closeY,
    };
  });

  return { candles, warnings };
}
