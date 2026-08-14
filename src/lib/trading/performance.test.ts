import { describe, expect, it } from "vitest";

import { computePerformanceStats } from "@/lib/trading/performance";

describe("computePerformanceStats", () => {
  it("returns empty/null stats for no trades", () => {
    const stats = computePerformanceStats([]);
    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBeNull();
    expect(stats.avgWinCents).toBeNull();
    expect(stats.avgLossCents).toBeNull();
    expect(stats.profitFactor).toBeNull();
    expect(stats.avgR).toBeNull();
    expect(stats.rSampleSize).toBe(0);
    expect(stats.maxDrawdownCents).toBe(0);
    expect(stats.equityCurve).toEqual([]);
  });

  it("handles a single winning trade", () => {
    const stats = computePerformanceStats([
      { pnlCents: 10_000, riskAmountCents: 5_000, closedAt: "2026-01-01T00:00:00Z" },
    ]);
    expect(stats.totalTrades).toBe(1);
    expect(stats.winningTrades).toBe(1);
    expect(stats.losingTrades).toBe(0);
    expect(stats.winRate).toBe(100);
    expect(stats.avgWinCents).toBe(10_000);
    expect(stats.avgLossCents).toBeNull();
    // No losing trades to normalize against — undefined, not Infinity.
    expect(stats.profitFactor).toBeNull();
    expect(stats.avgR).toBe(2); // 10,000 / 5,000
    expect(stats.rSampleSize).toBe(1);
    expect(stats.maxDrawdownCents).toBe(0);
    expect(stats.netPnlCents).toBe(10_000);
  });

  it("handles a single losing trade", () => {
    const stats = computePerformanceStats([
      { pnlCents: -4_000, riskAmountCents: 5_000, closedAt: "2026-01-01T00:00:00Z" },
    ]);
    expect(stats.winRate).toBe(0);
    expect(stats.avgLossCents).toBe(4_000);
    expect(stats.avgWinCents).toBeNull();
    // A losing-only sample has a real, informative profit factor of 0 —
    // distinct from "not computable" (which is null).
    expect(stats.profitFactor).toBe(0);
    expect(stats.avgR).toBe(-0.8); // -4,000 / 5,000
    expect(stats.maxDrawdownCents).toBe(4_000);
  });

  it("counts a break-even trade separately from wins and losses", () => {
    const stats = computePerformanceStats([
      { pnlCents: 0, riskAmountCents: 5_000, closedAt: "2026-01-01T00:00:00Z" },
    ]);
    expect(stats.winningTrades).toBe(0);
    expect(stats.losingTrades).toBe(0);
    expect(stats.breakEvenTrades).toBe(1);
    expect(stats.winRate).toBe(0);
  });

  it("computes win rate, profit factor and avg win/loss across a mixed sample", () => {
    const stats = computePerformanceStats([
      { pnlCents: 20_000, riskAmountCents: 10_000, closedAt: "2026-01-01T00:00:00Z" },
      { pnlCents: -10_000, riskAmountCents: 10_000, closedAt: "2026-01-02T00:00:00Z" },
      { pnlCents: 30_000, riskAmountCents: 10_000, closedAt: "2026-01-03T00:00:00Z" },
      { pnlCents: -5_000, riskAmountCents: 10_000, closedAt: "2026-01-04T00:00:00Z" },
    ]);

    expect(stats.totalTrades).toBe(4);
    expect(stats.winningTrades).toBe(2);
    expect(stats.losingTrades).toBe(2);
    expect(stats.winRate).toBe(50);
    expect(stats.avgWinCents).toBe(25_000); // (20,000 + 30,000) / 2
    expect(stats.avgLossCents).toBe(7_500); // (10,000 + 5,000) / 2
    expect(stats.profitFactor).toBeCloseTo(50_000 / 15_000);
    expect(stats.avgR).toBeCloseTo((2 - 1 + 3 - 0.5) / 4);
    expect(stats.netPnlCents).toBe(35_000);
  });

  it("excludes trades with no recorded risk from the avgR sample, not from everything else", () => {
    const stats = computePerformanceStats([
      { pnlCents: 10_000, riskAmountCents: 5_000, closedAt: "2026-01-01T00:00:00Z" },
      { pnlCents: -2_000, riskAmountCents: null, closedAt: "2026-01-02T00:00:00Z" },
    ]);
    expect(stats.totalTrades).toBe(2);
    expect(stats.rSampleSize).toBe(1);
    expect(stats.avgR).toBe(2); // only the first trade contributes
    expect(stats.netPnlCents).toBe(8_000);
  });

  it("treats a zero or negative recorded risk the same as no risk recorded", () => {
    const stats = computePerformanceStats([
      { pnlCents: 10_000, riskAmountCents: 0, closedAt: "2026-01-01T00:00:00Z" },
      { pnlCents: 10_000, riskAmountCents: -100, closedAt: "2026-01-02T00:00:00Z" },
    ]);
    expect(stats.rSampleSize).toBe(0);
    expect(stats.avgR).toBeNull();
  });

  it("computes max drawdown as the largest peak-to-trough decline in cumulative P/L", () => {
    const stats = computePerformanceStats([
      { pnlCents: 10_000, riskAmountCents: null, closedAt: "2026-01-01T00:00:00Z" }, // cum 10,000 (peak)
      { pnlCents: 5_000, riskAmountCents: null, closedAt: "2026-01-02T00:00:00Z" }, // cum 15,000 (new peak)
      { pnlCents: -8_000, riskAmountCents: null, closedAt: "2026-01-03T00:00:00Z" }, // cum 7,000 (drawdown 8,000)
      { pnlCents: 1_000, riskAmountCents: null, closedAt: "2026-01-04T00:00:00Z" }, // cum 8,000 (still down 7,000 from peak)
    ]);
    expect(stats.equityCurve.map((p) => p.cumulativePnlCents)).toEqual([
      10_000, 15_000, 7_000, 8_000,
    ]);
    expect(stats.maxDrawdownCents).toBe(8_000);
  });

  it("sorts trades by closedAt before building the equity curve, regardless of input order", () => {
    const stats = computePerformanceStats([
      { pnlCents: 5_000, riskAmountCents: null, closedAt: "2026-01-02T00:00:00Z" },
      { pnlCents: 10_000, riskAmountCents: null, closedAt: "2026-01-01T00:00:00Z" },
    ]);
    expect(stats.equityCurve.map((p) => p.date)).toEqual([
      "2026-01-01T00:00:00Z",
      "2026-01-02T00:00:00Z",
    ]);
    expect(stats.equityCurve.map((p) => p.cumulativePnlCents)).toEqual([10_000, 15_000]);
  });
});
