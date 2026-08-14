import { describe, expect, it } from "vitest";

import { findSupportResistanceLevels } from "@/lib/technical-analysis/levels";
import type { OHLCVCandle } from "@/lib/market-data/types";

function makeCandles(values: number[]): OHLCVCandle[] {
  return values.map((v, i) => ({
    time: i * 3600,
    open: v,
    high: v,
    low: v,
    close: v,
    volume: 100,
  }));
}

describe("findSupportResistanceLevels", () => {
  it("returns nothing when there aren't enough candles to find a pivot", () => {
    const candles = makeCandles([100, 100, 100, 100]);
    expect(findSupportResistanceLevels(candles, 100)).toEqual([]);
  });

  it("returns nothing for perfectly flat price action (no genuine swing points)", () => {
    const candles = makeCandles(new Array(21).fill(100));
    expect(findSupportResistanceLevels(candles, 100)).toEqual([]);
  });

  it("clusters repeated swing lows into a stronger support level than a single swing high", () => {
    const values = [
      100, 100, 100, 100, 100, // 0-4
      90, // 5: swing low #1
      100, 100, 100, 100, // 6-9
      110, // 10: swing high
      100, 100, 100, 100, // 11-14
      90, // 15: swing low #2
      100, 100, 100, 100, 100, // 16-20
    ];
    const candles = makeCandles(values);
    const levels = findSupportResistanceLevels(candles, 100);

    expect(levels).toEqual([
      { type: "support", price: 90, touches: 2 },
      { type: "resistance", price: 110, touches: 1 },
    ]);
  });

  it("only returns support below and resistance above the given current price", () => {
    const values = [
      100, 100, 100, 100, 100,
      90,
      100, 100, 100, 100,
      110,
      100, 100, 100, 100, 100, 100,
    ];
    const candles = makeCandles(values);
    // Current price sits between the two swing points either way, so both
    // should still classify correctly regardless of where "now" is.
    const levels = findSupportResistanceLevels(candles, 95);
    expect(levels.find((l) => l.price === 90)?.type).toBe("support");
    expect(levels.find((l) => l.price === 110)?.type).toBe("resistance");
  });
});
