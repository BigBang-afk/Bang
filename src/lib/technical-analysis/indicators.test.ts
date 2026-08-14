import { describe, expect, it } from "vitest";

import {
  adx,
  atr,
  averageVolume,
  bollingerBands,
  ema,
  lastValue,
  macd,
  momentum,
  relativeVolume,
  rsi,
  sma,
  vwap,
} from "@/lib/technical-analysis/indicators";
import type { OHLCVCandle } from "@/lib/market-data/types";

function makeCandles(
  closes: number[],
  opts: { volume?: number[]; rangePad?: number } = {}
): OHLCVCandle[] {
  const { volume, rangePad = 1 } = opts;
  return closes.map((close, i) => ({
    time: i * 3600,
    open: close,
    high: close + rangePad,
    low: close - rangePad,
    close,
    volume: volume ? volume[i] : 100,
  }));
}

describe("sma", () => {
  it("returns null during warm-up and the running average after", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it("throws for a non-positive period", () => {
    expect(() => sma([1, 2, 3], 0)).toThrow();
  });
});

describe("ema", () => {
  it("seeds with an SMA then applies the EMA recursion", () => {
    // period=3 -> k=0.5; hand-computed: seed at i=2 is avg(1,2,3)=2,
    // then ema[i] = value*0.5 + prevEma*0.5.
    expect(ema([1, 2, 3, 4, 5, 6], 3)).toEqual([null, null, 2, 3, 4, 5]);
  });

  it("skips a leading run of nulls before seeding (e.g. MACD's signal line)", () => {
    const withGap: (number | null)[] = [null, null, 1, 2, 3, 4, 5, 6];
    expect(ema(withGap, 3)).toEqual([null, null, null, null, 2, 3, 4, 5]);
  });
});

describe("rsi", () => {
  it("is 100 for a strictly increasing series (no losses)", () => {
    const closes = Array.from({ length: 20 }, (_, i) => i + 1);
    const result = rsi(closes, 14);
    expect(result[14]).toBe(100);
    expect(result[19]).toBe(100);
    expect(result.slice(0, 14)).toEqual(new Array(14).fill(null));
  });

  it("is 0 for a strictly decreasing series (no gains)", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 - i);
    const result = rsi(closes, 14);
    expect(result[14]).toBe(0);
  });

  it("stays within [0, 100] for a mixed series", () => {
    const closes = [10, 11, 9, 12, 8, 13, 14, 10, 15, 16, 12, 17, 18, 19, 20, 15, 21];
    const result = rsi(closes, 14);
    for (const v of result) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("macd", () => {
  it("produces a positive histogram for an accelerating uptrend", () => {
    // A perfectly linear (constant-slope) trend makes the MACD line
    // converge to a flat constant, so the histogram (macd - signal)
    // correctly settles near zero — that's not a bug. Use an
    // accelerating trend instead, where the histogram should stay
    // meaningfully positive.
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * i * 0.05);
    const { histogram, macdLine, signalLine } = macd(closes, 12, 26, 9);
    expect(histogram).toHaveLength(closes.length);
    expect(lastValue(histogram)).not.toBeNull();
    expect(lastValue(histogram)!).toBeGreaterThan(0);
    expect(lastValue(macdLine)!).toBeGreaterThan(0);
    expect(lastValue(signalLine)).not.toBeNull();
  });
});

describe("atr", () => {
  it("is positive and null only during warm-up", () => {
    const candles = makeCandles(
      Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5),
      { rangePad: 2 }
    );
    const result = atr(candles, 14);
    expect(result.slice(0, 14)).toEqual(new Array(14).fill(null));
    expect(result[14]).not.toBeNull();
    expect(result[14]!).toBeGreaterThan(0);
  });
});

describe("bollingerBands", () => {
  it("keeps upper >= middle >= lower everywhere it has a value", () => {
    const closes = [
      10, 11, 12, 11, 13, 14, 12, 15, 16, 14, 17, 18, 16, 19, 20, 18, 21, 22, 20, 23,
    ];
    const { upper, middle, lower } = bollingerBands(closes, 5, 2);
    for (let i = 0; i < closes.length; i++) {
      if (middle[i] === null) continue;
      expect(upper[i]!).toBeGreaterThanOrEqual(middle[i]!);
      expect(middle[i]!).toBeGreaterThanOrEqual(lower[i]!);
    }
  });

  it("has zero width when price is perfectly flat", () => {
    const closes = new Array(10).fill(100);
    const { upper, lower } = bollingerBands(closes, 5, 2);
    expect(upper[9]).toBeCloseTo(100);
    expect(lower[9]).toBeCloseTo(100);
  });
});

describe("vwap", () => {
  it("matches a hand-computed two-candle example", () => {
    const candles = makeCandles([10, 20], { volume: [100, 200], rangePad: 0 });
    // typical price == close here since rangePad=0.
    // vwap[0] = 10 (single candle). vwap[1] = (10*100 + 20*200) / 300 = 16.666...
    const result = vwap(candles);
    expect(result[0]).toBeCloseTo(10);
    expect(result[1]).toBeCloseTo(5000 / 300);
  });

  it("returns null when the provider gives no volume", () => {
    const candles = makeCandles([10, 20]).map((c) => ({ ...c, volume: null }));
    expect(vwap(candles)).toEqual([null, null]);
  });
});

describe("averageVolume / relativeVolume", () => {
  it("flags above-average volume correctly", () => {
    const volumes = [10, 10, 10, 10, 10, 50];
    const candles = makeCandles([1, 2, 3, 4, 5, 6], { volume: volumes });
    const avg = averageVolume(candles, 5);
    expect(avg[4]).toBeCloseTo(10);
    const rel = relativeVolume(candles, 5);
    // avg[5] is the SMA of indices 1..5 = (10+10+10+10+50)/5 = 18, so
    // rel[5] = 50 / 18, not 50 / avg[4] — the window has slid forward.
    expect(rel[5]).toBeCloseTo(50 / 18);
  });
});

describe("momentum", () => {
  it("computes the % rate of change over the period", () => {
    const closes = [100, 100, 100, 100, 100, 110];
    const result = momentum(closes, 5);
    expect(result[5]).toBeCloseTo(10); // (110-100)/100 * 100
  });
});

describe("adx", () => {
  it("shows +DI dominant and a meaningful ADX value in a clean uptrend", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 3);
    const candles = makeCandles(closes, { rangePad: 1 });
    const result = adx(candles, 14);
    const plusDI = lastValue(result.plusDI);
    const minusDI = lastValue(result.minusDI);
    const adxVal = lastValue(result.adx);
    expect(plusDI).not.toBeNull();
    expect(minusDI).not.toBeNull();
    expect(plusDI!).toBeGreaterThan(minusDI!);
    expect(adxVal).not.toBeNull();
    expect(adxVal!).toBeGreaterThan(0);
  });
});

describe("lastValue", () => {
  it("returns the last non-null entry", () => {
    expect(lastValue([1, 2, null, null])).toBe(2);
    expect(lastValue([null, null])).toBeNull();
    expect(lastValue([])).toBeNull();
  });
});
