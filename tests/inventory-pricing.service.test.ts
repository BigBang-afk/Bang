import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  calculateInventoryPricing,
  InventoryPricingError,
} from "@/services/inventory-pricing.service";

function n(value: Decimal): number {
  return value.toNumber();
}

describe("calculateInventoryPricing — spec example", () => {
  it("Gold=420000, Making=15000, Stone=5000, Other=2000 -> Total=442000", () => {
    const result = calculateInventoryPricing({
      goldValue: 420000,
      makingCharge: 15000,
      stoneCharge: 5000,
      otherCharge: 2000,
      sellingPrice: 500000,
    });

    expect(n(result.totalCost)).toBe(442000);
    expect(n(result.expectedProfit)).toBe(58000);
    // 58000 / 500000 * 100 = 11.6
    expect(n(result.profitMarginPercent)).toBeCloseTo(11.6, 8);
  });

  it("full spec worked example including diamond charge defaults to zero", () => {
    const result = calculateInventoryPricing({
      goldValue: 420000,
      makingCharge: 15000,
      stoneCharge: 5000,
      otherCharge: 2000,
      sellingPrice: 500000,
    });
    expect(n(result.diamondCharge)).toBe(0);
  });
});

describe("calculateInventoryPricing — charges", () => {
  it("defaults every charge to zero when omitted", () => {
    const result = calculateInventoryPricing({
      goldValue: 100000,
      sellingPrice: 120000,
    });
    expect(n(result.totalCost)).toBe(100000);
    expect(n(result.expectedProfit)).toBe(20000);
  });

  it("sums all four charge types", () => {
    const result = calculateInventoryPricing({
      goldValue: 100000,
      makingCharge: 10000,
      stoneCharge: 5000,
      diamondCharge: 20000,
      otherCharge: 1000,
      sellingPrice: 200000,
    });
    expect(n(result.totalCost)).toBe(136000);
  });
});

describe("calculateInventoryPricing — profit and loss", () => {
  it("computes negative expected profit when selling below cost (a loss)", () => {
    const result = calculateInventoryPricing({
      goldValue: 100000,
      makingCharge: 10000,
      sellingPrice: 90000,
    });
    expect(n(result.totalCost)).toBe(110000);
    expect(n(result.expectedProfit)).toBe(-20000);
    expect(result.expectedProfit.isNegative()).toBe(true);
  });

  it("computes zero profit when selling price equals total cost", () => {
    const result = calculateInventoryPricing({
      goldValue: 100000,
      sellingPrice: 100000,
    });
    expect(n(result.expectedProfit)).toBe(0);
    expect(n(result.profitMarginPercent)).toBe(0);
  });
});

describe("calculateInventoryPricing — invalid input", () => {
  it("rejects a negative gold value", () => {
    expect(() =>
      calculateInventoryPricing({ goldValue: -1, sellingPrice: 100 }),
    ).toThrow(InventoryPricingError);
  });

  it("rejects a negative making charge", () => {
    expect(() =>
      calculateInventoryPricing({ goldValue: 100, makingCharge: -1, sellingPrice: 200 }),
    ).toThrow(/making charge/i);
  });

  it("rejects a negative stone charge", () => {
    expect(() =>
      calculateInventoryPricing({ goldValue: 100, stoneCharge: -5, sellingPrice: 200 }),
    ).toThrow(/stone charge/i);
  });

  it("rejects a negative diamond charge", () => {
    expect(() =>
      calculateInventoryPricing({ goldValue: 100, diamondCharge: -5, sellingPrice: 200 }),
    ).toThrow(/diamond charge/i);
  });

  it("rejects a negative other charge", () => {
    expect(() =>
      calculateInventoryPricing({ goldValue: 100, otherCharge: -5, sellingPrice: 200 }),
    ).toThrow(/other charge/i);
  });

  it("rejects zero selling price", () => {
    expect(() =>
      calculateInventoryPricing({ goldValue: 100, sellingPrice: 0 }),
    ).toThrow(/selling price/i);
  });

  it("rejects negative selling price", () => {
    expect(() =>
      calculateInventoryPricing({ goldValue: 100, sellingPrice: -100 }),
    ).toThrow(/selling price/i);
  });

  it("rejects missing selling price", () => {
    expect(() =>
      // @ts-expect-error intentional missing field
      calculateInventoryPricing({ goldValue: 100 }),
    ).toThrow(/selling price is required/i);
  });

  it("exposes the offending field on the error", () => {
    try {
      calculateInventoryPricing({ goldValue: 100, stoneCharge: -1, sellingPrice: 200 });
      expect.fail("expected calculateInventoryPricing to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(InventoryPricingError);
      expect((error as InventoryPricingError).field).toBe("stoneCharge");
    }
  });
});

describe("calculateInventoryPricing — precision", () => {
  it("never uses native floating point (0.1 + 0.2 style drift)", () => {
    const result = calculateInventoryPricing({
      goldValue: 0.1,
      makingCharge: 0.2,
      sellingPrice: 1,
    });
    expect(result.totalCost.toString()).toBe("0.3");
  });

  it("keeps full precision without premature rounding", () => {
    const result = calculateInventoryPricing({
      goldValue: 100000,
      sellingPrice: 300000,
    });
    // 200000 / 300000 * 100 = 66.66666...
    expect(result.profitMarginPercent.toString().startsWith("66.666")).toBe(true);
  });
});
