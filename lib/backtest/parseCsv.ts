import type { OhlcBar } from "./types";

/** Parses user-supplied OHLC data. Accepts CSV with either
 * "time,open,high,low,close" or just "open,high,low,close" per line
 * (header row optional, auto-detected). Rows are assumed chronological. */
export function parseOhlcCsv(text: string): OhlcBar[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const bars: OhlcBar[] = [];
  let syntheticTime = 0;

  for (const line of lines) {
    const cells = line.split(",").map((c) => c.trim());
    const nums = cells.map(Number);

    if (nums.some((n) => Number.isNaN(n))) continue; // header row or junk

    let time: number;
    let open: number;
    let high: number;
    let low: number;
    let close: number;

    if (nums.length >= 5) {
      [time, open, high, low, close] = nums;
    } else if (nums.length === 4) {
      [open, high, low, close] = nums;
      time = syntheticTime++;
    } else {
      continue;
    }

    bars.push({ time, open, high, low, close });
  }

  return bars;
}
