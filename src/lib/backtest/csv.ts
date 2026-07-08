import { Candle } from "@/lib/types";

export interface ParsedCandleRow extends Candle {
  pair?: string;
}

function parseTime(raw: string): number {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return n > 1e12 ? Math.floor(n / 1000) : n; // accept ms or s epoch
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) throw new Error(`Unrecognized timestamp: ${raw}`);
  return Math.floor(parsed / 1000);
}

/**
 * Parses CSV text with a header row containing at least
 * time,open,high,low,close (any order), plus an optional `pair` column.
 */
export function parseCandleCsv(text: string): ParsedCandleRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) throw new Error("CSV must contain a header row and at least one data row");

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const timeIdx = idx("time") !== -1 ? idx("time") : idx("timestamp") !== -1 ? idx("timestamp") : idx("date");
  const openIdx = idx("open");
  const highIdx = idx("high");
  const lowIdx = idx("low");
  const closeIdx = idx("close");
  const pairIdx = idx("pair");

  if ([timeIdx, openIdx, highIdx, lowIdx, closeIdx].some((i) => i === -1)) {
    throw new Error("CSV header must include time, open, high, low, close columns");
  }

  const rows: ParsedCandleRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < header.length) continue;
    const row: ParsedCandleRow = {
      time: parseTime(cols[timeIdx]),
      open: Number(cols[openIdx]),
      high: Number(cols[highIdx]),
      low: Number(cols[lowIdx]),
      close: Number(cols[closeIdx]),
      pair: pairIdx !== -1 ? cols[pairIdx].trim() : undefined,
    };
    if ([row.open, row.high, row.low, row.close].some((v) => Number.isNaN(v))) continue;
    rows.push(row);
  }

  rows.sort((a, b) => a.time - b.time);
  return rows;
}
