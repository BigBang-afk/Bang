import { describe, expect, it } from "vitest";

import { computeTradePnl } from "@/lib/trading/trade-pnl";
import { RiskRewardInputError } from "@/lib/trading/risk-reward";

describe("computeTradePnl", () => {
  it("computes a winning long", () => {
    const result = computeTradePnl({
      direction: "long",
      entryPrice: 100,
      exitPrice: 110,
      positionSize: 10,
    });
    expect(result.pnlCents).toBe(10_000); // (110-100)*10 = 100 -> 10,000 cents
    expect(result.pnlPercent).toBeCloseTo(10); // 100 / (100*10) * 100
  });

  it("computes a losing long", () => {
    const result = computeTradePnl({
      direction: "long",
      entryPrice: 100,
      exitPrice: 90,
      positionSize: 10,
    });
    expect(result.pnlCents).toBe(-10_000);
    expect(result.pnlPercent).toBeCloseTo(-10);
  });

  it("computes a winning short", () => {
    const result = computeTradePnl({
      direction: "short",
      entryPrice: 100,
      exitPrice: 90,
      positionSize: 10,
    });
    expect(result.pnlCents).toBe(10_000);
    expect(result.pnlPercent).toBeCloseTo(10);
  });

  it("computes a losing short", () => {
    const result = computeTradePnl({
      direction: "short",
      entryPrice: 100,
      exitPrice: 110,
      positionSize: 10,
    });
    expect(result.pnlCents).toBe(-10_000);
    expect(result.pnlPercent).toBeCloseTo(-10);
  });

  it("subtracts fees from the cents figure but not from the percent", () => {
    const result = computeTradePnl({
      direction: "long",
      entryPrice: 100,
      exitPrice: 110,
      positionSize: 10,
      feesCents: 500,
    });
    expect(result.pnlCents).toBe(9_500);
    expect(result.pnlPercent).toBeCloseTo(10);
  });

  it("rounds fractional cents to the nearest cent", () => {
    const result = computeTradePnl({
      direction: "long",
      entryPrice: 100,
      exitPrice: 100.333,
      positionSize: 3,
    });
    // (100.333-100)*3 = 0.999 -> 99.9 cents -> rounds to 100
    expect(result.pnlCents).toBe(100);
  });

  it("throws for a non-positive entry, exit, or position size", () => {
    expect(() =>
      computeTradePnl({ direction: "long", entryPrice: 0, exitPrice: 110, positionSize: 10 })
    ).toThrow(RiskRewardInputError);
    expect(() =>
      computeTradePnl({ direction: "long", entryPrice: 100, exitPrice: -1, positionSize: 10 })
    ).toThrow(RiskRewardInputError);
    expect(() =>
      computeTradePnl({ direction: "long", entryPrice: 100, exitPrice: 110, positionSize: 0 })
    ).toThrow(RiskRewardInputError);
  });

  it("returns zero P/L for a flat exit (breakeven, minus any fees)", () => {
    const result = computeTradePnl({
      direction: "long",
      entryPrice: 100,
      exitPrice: 100,
      positionSize: 10,
    });
    expect(result.pnlCents).toBe(0);
    expect(result.pnlPercent).toBe(0);
  });
});
