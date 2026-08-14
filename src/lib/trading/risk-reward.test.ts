import { describe, expect, it } from "vitest";

import { RiskRewardInputError, computeRiskReward } from "@/lib/trading/risk-reward";

describe("computeRiskReward", () => {
  it("computes stop distance and R:R for a long with two take-profits", () => {
    const result = computeRiskReward({
      direction: "long",
      entry: 100,
      stopLoss: 95,
      takeProfits: [110, 120],
    });

    expect(result.stopDistance).toBe(5);
    expect(result.takeProfitResults).toHaveLength(2);
    expect(result.takeProfitResults[0]).toMatchObject({
      price: 110,
      rewardDistance: 10,
      riskRewardRatio: 2,
      onCorrectSide: true,
    });
    expect(result.takeProfitResults[1]).toMatchObject({
      price: 120,
      rewardDistance: 20,
      riskRewardRatio: 4,
      onCorrectSide: true,
    });
    expect(result.primaryRiskRewardRatio).toBe(2);
    expect(result.warnings).toEqual([]);
  });

  it("computes stop distance and R:R for a short", () => {
    const result = computeRiskReward({
      direction: "short",
      entry: 100,
      stopLoss: 105,
      takeProfits: [90],
    });

    expect(result.stopDistance).toBe(5);
    expect(result.takeProfitResults[0]).toMatchObject({
      rewardDistance: 10,
      riskRewardRatio: 2,
      onCorrectSide: true,
    });
    expect(result.warnings).toEqual([]);
  });

  it("handles no take-profit targets", () => {
    const result = computeRiskReward({
      direction: "long",
      entry: 100,
      stopLoss: 95,
      takeProfits: [],
    });
    expect(result.stopDistance).toBe(5);
    expect(result.takeProfitResults).toEqual([]);
    expect(result.primaryRiskRewardRatio).toBeNull();
  });

  it("ignores non-positive/non-finite take-profit entries rather than crashing", () => {
    const result = computeRiskReward({
      direction: "long",
      entry: 100,
      stopLoss: 95,
      takeProfits: [0, -10, NaN, 110],
    });
    expect(result.takeProfitResults).toHaveLength(1);
    expect(result.takeProfitResults[0].price).toBe(110);
  });

  it("warns (but still computes) when the stop is on the wrong side for a long", () => {
    const result = computeRiskReward({
      direction: "long",
      entry: 100,
      stopLoss: 105, // above entry — wrong side for a long
      takeProfits: [110],
    });
    expect(result.stopDistance).toBe(5);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "stop_wrong_side" })
    );
  });

  it("warns when a take-profit is on the wrong side for a short", () => {
    const result = computeRiskReward({
      direction: "short",
      entry: 100,
      stopLoss: 105,
      takeProfits: [110], // above entry — wrong side for a short
    });
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "take_profit_wrong_side" })
    );
    expect(result.takeProfitResults[0].onCorrectSide).toBe(false);
  });

  it("throws for a stop-loss equal to entry (zero-distance, undefined R:R)", () => {
    expect(() =>
      computeRiskReward({ direction: "long", entry: 100, stopLoss: 100, takeProfits: [110] })
    ).toThrow(RiskRewardInputError);
  });

  it("throws for a non-positive entry or stop", () => {
    expect(() =>
      computeRiskReward({ direction: "long", entry: 0, stopLoss: 95, takeProfits: [] })
    ).toThrow(RiskRewardInputError);
    expect(() =>
      computeRiskReward({ direction: "long", entry: 100, stopLoss: -5, takeProfits: [] })
    ).toThrow(RiskRewardInputError);
  });

  it("throws for non-finite input", () => {
    expect(() =>
      computeRiskReward({ direction: "long", entry: NaN, stopLoss: 95, takeProfits: [] })
    ).toThrow(RiskRewardInputError);
  });
});
