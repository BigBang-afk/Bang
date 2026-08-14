import { describe, expect, it } from "vitest";

import { RiskCalculatorInputError, calculateRisk } from "@/lib/trading/risk-calculator";

const BASE = {
  accountBalance: 10_000,
  riskPercent: 1,
  entry: 100,
  stopLoss: 95,
  takeProfit: 110,
  positionType: "long" as const,
};

describe("calculateRisk", () => {
  it("computes dollar risk, stop distance, reward and R:R the same regardless of instrument", () => {
    const result = calculateRisk({ ...BASE, marketType: null, symbol: null });
    expect(result.dollarRisk).toBe(100); // 1% of $10,000
    expect(result.stopDistance).toBe(5);
    expect(result.reward).toBe(10);
    expect(result.riskRewardRatio).toBe(2);
  });

  it("calculates position size for a directly USD-quoted instrument (crypto)", () => {
    const result = calculateRisk({ ...BASE, marketType: "crypto", symbol: "BTCUSD" });
    // dollarRisk 100 / stopDistance 5 = 20 units
    expect(result.positionSize).toBe(20);
    expect(result.positionSizeUnavailableReason).toBeNull();
  });

  it("calculates position size for stocks the same way", () => {
    const result = calculateRisk({ ...BASE, marketType: "stocks", symbol: "AAPL" });
    expect(result.positionSize).toBe(20);
  });

  it("calculates position size for the forex pairs this app tracks", () => {
    const result = calculateRisk({ ...BASE, marketType: "forex", symbol: "EURUSD" });
    expect(result.positionSize).toBe(20);
  });

  it("refuses to guess position size for metals (no contract spec) but still computes everything else", () => {
    const result = calculateRisk({ ...BASE, marketType: "metals", symbol: "XAUUSD" });
    expect(result.positionSize).toBeNull();
    expect(result.positionSizeUnavailableReason).toContain("XAUUSD");
    expect(result.positionSizeUnavailableReason).toContain("contract");
    // The rest is unaffected by the missing contract spec.
    expect(result.dollarRisk).toBe(100);
    expect(result.stopDistance).toBe(5);
    expect(result.riskRewardRatio).toBe(2);
  });

  it("refuses to guess position size for indices (no contract spec)", () => {
    const result = calculateRisk({ ...BASE, marketType: "indices", symbol: "US500" });
    expect(result.positionSize).toBeNull();
    expect(result.positionSizeUnavailableReason).not.toBeNull();
  });

  it("explains that no instrument was selected when marketType is null", () => {
    const result = calculateRisk({ ...BASE, marketType: null, symbol: null });
    expect(result.positionSize).toBeNull();
    expect(result.positionSizeUnavailableReason).toMatch(/select an instrument/i);
  });

  it("handles a short position", () => {
    const result = calculateRisk({
      ...BASE,
      positionType: "short",
      entry: 100,
      stopLoss: 105,
      takeProfit: 90,
      marketType: "crypto",
      symbol: "BTCUSD",
    });
    expect(result.stopDistance).toBe(5);
    expect(result.reward).toBe(10);
    expect(result.riskRewardRatio).toBe(2);
    expect(result.positionSize).toBe(20);
  });

  it("returns a null reward/R:R when no take-profit is given, but still sizes the position", () => {
    const result = calculateRisk({ ...BASE, takeProfit: null, marketType: "crypto", symbol: "BTCUSD" });
    expect(result.reward).toBeNull();
    expect(result.riskRewardRatio).toBeNull();
    expect(result.positionSize).toBe(20);
  });

  it("surfaces risk-reward warnings (e.g. a stop on the wrong side) unchanged", () => {
    const result = calculateRisk({
      ...BASE,
      stopLoss: 105, // wrong side for a long
      marketType: "crypto",
      symbol: "BTCUSD",
    });
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: "stop_wrong_side" }));
  });

  it("rejects a non-positive account balance", () => {
    expect(() => calculateRisk({ ...BASE, accountBalance: 0, marketType: null, symbol: null })).toThrow(
      RiskCalculatorInputError
    );
    expect(() =>
      calculateRisk({ ...BASE, accountBalance: -500, marketType: null, symbol: null })
    ).toThrow(RiskCalculatorInputError);
  });

  it("rejects a risk percentage outside (0, 100]", () => {
    expect(() => calculateRisk({ ...BASE, riskPercent: 0, marketType: null, symbol: null })).toThrow(
      RiskCalculatorInputError
    );
    expect(() =>
      calculateRisk({ ...BASE, riskPercent: 150, marketType: null, symbol: null })
    ).toThrow(RiskCalculatorInputError);
  });

  it("propagates the underlying entry/stop validation (equal entry and stop)", () => {
    expect(() =>
      calculateRisk({ ...BASE, stopLoss: 100, entry: 100, marketType: null, symbol: null })
    ).toThrow(RiskCalculatorInputError);
  });

  it("scales position size correctly with a larger account and risk percent", () => {
    const result = calculateRisk({
      ...BASE,
      accountBalance: 50_000,
      riskPercent: 2,
      marketType: "crypto",
      symbol: "BTCUSD",
    });
    // dollarRisk = 50,000 * 0.02 = 1,000; / stopDistance 5 = 200 units
    expect(result.dollarRisk).toBe(1000);
    expect(result.positionSize).toBe(200);
  });
});
