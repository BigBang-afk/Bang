import { describe, expect, it } from "vitest";

import { splitClosedAndForming } from "@/lib/technical-analysis/candles";
import {
  DEFAULT_ANALYSIS_SETTINGS,
  analyzeSymbol,
  minimumCandlesRequired,
} from "@/lib/technical-analysis/scoring";
import type { OHLCVCandle } from "@/lib/market-data/types";

function uptrendCandles(count: number, opts: { boostVolumeLast?: number } = {}): OHLCVCandle[] {
  return Array.from({ length: count }, (_, i) => {
    const close = 100 + i * 0.6;
    const isRecent = opts.boostVolumeLast && i >= count - opts.boostVolumeLast;
    return {
      time: i * 3600,
      open: close - 0.3,
      high: close + 0.4,
      low: close - 0.5,
      close,
      volume: isRecent ? 500 : 100,
    };
  });
}

function flatCandles(count: number): OHLCVCandle[] {
  return Array.from({ length: count }, (_, i) => ({
    time: i * 3600,
    open: 100,
    high: 100.2,
    low: 99.8,
    close: 100,
    volume: 100,
  }));
}

describe("minimumCandlesRequired", () => {
  it("is driven by the slowest configured indicator", () => {
    const n = minimumCandlesRequired(DEFAULT_ANALYSIS_SETTINGS);
    expect(n).toBeGreaterThanOrEqual(DEFAULT_ANALYSIS_SETTINGS.emaSlowPeriod);
  });
});

describe("analyzeSymbol", () => {
  it("returns null when there isn't enough history yet", () => {
    const candles = uptrendCandles(10);
    expect(analyzeSymbol(candles, "BTCUSD", "1h")).toBeNull();
  });

  it("reads a sustained uptrend with strong recent volume as bullish", () => {
    const candles = uptrendCandles(90, { boostVolumeLast: 20 });
    const snapshot = analyzeSymbol(candles, "BTCUSD", "1h");

    expect(snapshot).not.toBeNull();
    expect(snapshot!.trend).toBe("bullish");
    expect(snapshot!.score).toBeGreaterThan(0);
    expect(snapshot!.supportingConditions.length).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(snapshot!.riskLevel);
    // Every field a caller might show the user should be traceable to a
    // real indicator value, not a made-up number.
    expect(snapshot!.indicators.emaFast).not.toBeNull();
    expect(snapshot!.indicators.rsi).not.toBeNull();
  });

  it("never calls a setup type without score/support to back it", () => {
    const candles = uptrendCandles(90, { boostVolumeLast: 20 });
    const snapshot = analyzeSymbol(candles, "BTCUSD", "1h")!;
    if (snapshot.setupType !== null) {
      expect(snapshot.score).toBeGreaterThanOrEqual(60);
      expect(snapshot.supportingConditions.length).toBeGreaterThan(0);
    }
  });

  it("reads flat price action as neutral with no setup", () => {
    const candles = flatCandles(90);
    const snapshot = analyzeSymbol(candles, "BTCUSD", "1h");
    expect(snapshot).not.toBeNull();
    expect(snapshot!.trend).toBe("neutral");
    expect(snapshot!.setupType).toBeNull();
  });

  it("scopes the snapshot's timestamp to the last CLOSED candle, never a forming one", () => {
    const candles = uptrendCandles(90, { boostVolumeLast: 20 });
    // Simulate "now" as partway through what would be the next candle,
    // making a 91st (extreme, anomalous) raw candle still-forming.
    const rawWithForming: OHLCVCandle[] = [
      ...candles,
      { time: 90 * 3600, open: 1000, high: 2000, low: 900, close: 1900, volume: 999999 },
    ];
    const now = new Date((90 * 3600 + 1800) * 1000); // 30 min into the new hourly candle

    const { closed, forming } = splitClosedAndForming(rawWithForming, "1h", now);
    expect(forming).not.toBeNull();
    expect(closed).toHaveLength(candles.length);

    const snapshotFromClosedOnly = analyzeSymbol(closed, "BTCUSD", "1h");
    const snapshotFromOriginal = analyzeSymbol(candles, "BTCUSD", "1h");

    // Analyzing the properly-split "closed" set must match analyzing the
    // original (pre-anomaly) candles exactly — the anomalous forming
    // candle must not have leaked into any indicator.
    expect(snapshotFromClosedOnly).toEqual(snapshotFromOriginal);
  });
});
