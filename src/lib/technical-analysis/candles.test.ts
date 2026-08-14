import { describe, expect, it } from "vitest";

import { splitClosedAndForming } from "@/lib/technical-analysis/candles";
import type { OHLCVCandle } from "@/lib/market-data/types";

function candleAt(timeSeconds: number): OHLCVCandle {
  return { time: timeSeconds, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 };
}

describe("splitClosedAndForming", () => {
  it("treats the last candle as forming when its close time is in the future", () => {
    const now = new Date("2026-01-01T01:00:00Z");
    // 1h candle opened at 00:30 -> closes at 01:30, which is after `now`.
    const openTime = new Date("2026-01-01T00:30:00Z").getTime() / 1000;
    const candles = [candleAt(openTime - 3600), candleAt(openTime)];

    const { closed, forming } = splitClosedAndForming(candles, "1h", now);

    expect(closed).toHaveLength(1);
    expect(closed[0].time).toBe(openTime - 3600);
    expect(forming).not.toBeNull();
    expect(forming!.time).toBe(openTime);
  });

  it("treats the last candle as closed once a full timeframe has elapsed", () => {
    const now = new Date("2026-01-01T02:00:00Z");
    const openTime = new Date("2026-01-01T00:30:00Z").getTime() / 1000; // closes 01:30, before now
    const candles = [candleAt(openTime - 3600), candleAt(openTime)];

    const { closed, forming } = splitClosedAndForming(candles, "1h", now);

    expect(closed).toHaveLength(2);
    expect(forming).toBeNull();
  });

  it("returns empty output for an empty input", () => {
    expect(splitClosedAndForming([], "1h")).toEqual({ closed: [], forming: null });
  });

  it("respects each timeframe's own duration", () => {
    const now = new Date("2026-01-01T00:04:00Z");
    const openTime = new Date("2026-01-01T00:00:00Z").getTime() / 1000;
    const candles = [candleAt(openTime)];

    // A 1m candle opened at 00:00 closes at 00:01 — well before `now` (00:04).
    expect(splitClosedAndForming(candles, "1m", now).forming).toBeNull();
    // A 15m candle opened at 00:00 closes at 00:15 — still forming at 00:04.
    expect(splitClosedAndForming(candles, "15m", now).forming).not.toBeNull();
  });
});
