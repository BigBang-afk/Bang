import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  calculateGoldValue,
  GoldCalculationError,
} from "@/services/gold-calculation.service";

function n(value: Decimal): number {
  return value.toNumber();
}

describe("calculateGoldValue — spec examples", () => {
  it("Test 1: Net=10, Wastage=5%, Rate=40000", () => {
    const result = calculateGoldValue({
      netWeight: 10,
      goldRate: 40000,
      wastage: { type: "PERCENTAGE", wastagePercent: 5 },
    });

    expect(n(result.wastageWeight)).toBe(0.5);
    expect(n(result.grossWeight)).toBe(10.5);
    expect(n(result.goldValue)).toBe(420000);
  });

  it("Test 2: Net=25, Wastage=2%, Rate=40000", () => {
    const result = calculateGoldValue({
      netWeight: 25,
      goldRate: 40000,
      wastage: { type: "PERCENTAGE", wastagePercent: 2 },
    });

    expect(n(result.wastageWeight)).toBe(0.5);
    expect(n(result.grossWeight)).toBe(25.5);
    expect(n(result.goldValue)).toBe(1020000);
  });

  it("Test 3: Net=10, Fixed wastage=0.75, Rate=40000", () => {
    const result = calculateGoldValue({
      netWeight: 10,
      goldRate: 40000,
      wastage: { type: "FIXED_GRAMS", wastageGrams: 0.75 },
    });

    expect(n(result.grossWeight)).toBe(10.75);
    expect(n(result.goldValue)).toBe(430000);
  });
});

describe("calculateGoldValue — wastage types", () => {
  it("returns wastagePercent for PERCENTAGE wastage", () => {
    const result = calculateGoldValue({
      netWeight: 10,
      goldRate: 1000,
      wastage: { type: "PERCENTAGE", wastagePercent: 10 },
    });
    expect(result.wastageType).toBe("PERCENTAGE");
    expect(n(result.wastagePercent!)).toBe(10);
  });

  it("returns null wastagePercent for FIXED_GRAMS wastage", () => {
    const result = calculateGoldValue({
      netWeight: 10,
      goldRate: 1000,
      wastage: { type: "FIXED_GRAMS", wastageGrams: 0.25 },
    });
    expect(result.wastageType).toBe("FIXED_GRAMS");
    expect(result.wastagePercent).toBeNull();
  });

  it("allows zero wastage percentage (no wastage)", () => {
    const result = calculateGoldValue({
      netWeight: 10,
      goldRate: 1000,
      wastage: { type: "PERCENTAGE", wastagePercent: 0 },
    });
    expect(n(result.wastageWeight)).toBe(0);
    expect(n(result.grossWeight)).toBe(10);
  });

  it("allows zero fixed wastage grams", () => {
    const result = calculateGoldValue({
      netWeight: 10,
      goldRate: 1000,
      wastage: { type: "FIXED_GRAMS", wastageGrams: 0 },
    });
    expect(n(result.grossWeight)).toBe(10);
  });
});

describe("calculateGoldValue — pricing modes", () => {
  const base = {
    netWeight: 10,
    goldRate: 40000,
    wastage: { type: "PERCENTAGE" as const, wastagePercent: 5 },
  };

  it("MODE_A and MODE_B are equivalent (gross weight x rate)", () => {
    const modeA = calculateGoldValue({ ...base, pricingMode: "MODE_A" });
    const modeB = calculateGoldValue({ ...base, pricingMode: "MODE_B" });
    expect(n(modeA.goldValue)).toBe(420000);
    expect(n(modeB.goldValue)).toBe(420000);
  });

  it("defaults to MODE_A when pricingMode is omitted", () => {
    const result = calculateGoldValue(base);
    expect(result.pricingMode).toBe("MODE_A");
    expect(n(result.goldValue)).toBe(420000);
  });

  it("MODE_C uses net weight x rate + making charges", () => {
    const result = calculateGoldValue({
      ...base,
      pricingMode: "MODE_C",
      makingCharges: 5000,
    });
    // netWeight(10) * goldRate(40000) + makingCharges(5000)
    expect(n(result.goldValue)).toBe(405000);
    expect(n(result.makingCharges!)).toBe(5000);
  });

  it("MODE_C defaults making charges to zero when omitted", () => {
    const result = calculateGoldValue({ ...base, pricingMode: "MODE_C" });
    expect(n(result.goldValue)).toBe(400000);
  });
});

describe("calculateGoldValue — invalid input handling", () => {
  it("rejects zero net weight", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: 0,
        goldRate: 40000,
        wastage: { type: "PERCENTAGE", wastagePercent: 5 },
      }),
    ).toThrow(GoldCalculationError);
  });

  it("rejects negative net weight", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: -5,
        goldRate: 40000,
        wastage: { type: "PERCENTAGE", wastagePercent: 5 },
      }),
    ).toThrow(/greater than zero/i);
  });

  it("rejects negative gold rate", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: 10,
        goldRate: -40000,
        wastage: { type: "PERCENTAGE", wastagePercent: 5 },
      }),
    ).toThrow(/gold rate/i);
  });

  it("rejects zero gold rate", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: 10,
        goldRate: 0,
        wastage: { type: "PERCENTAGE", wastagePercent: 5 },
      }),
    ).toThrow(GoldCalculationError);
  });

  it("rejects negative wastage percentage", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: 10,
        goldRate: 40000,
        wastage: { type: "PERCENTAGE", wastagePercent: -1 },
      }),
    ).toThrow(/between 0 and 100/i);
  });

  it("rejects wastage percentage over 100", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: 10,
        goldRate: 40000,
        wastage: { type: "PERCENTAGE", wastagePercent: 150 },
      }),
    ).toThrow(/between 0 and 100/i);
  });

  it("rejects negative fixed wastage grams", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: 10,
        goldRate: 40000,
        wastage: { type: "FIXED_GRAMS", wastageGrams: -0.5 },
      }),
    ).toThrow(/zero or greater/i);
  });

  it("rejects negative making charges in MODE_C", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: 10,
        goldRate: 40000,
        pricingMode: "MODE_C",
        makingCharges: -100,
        wastage: { type: "PERCENTAGE", wastagePercent: 5 },
      }),
    ).toThrow(/making charges/i);
  });

  it("rejects missing net weight", () => {
    expect(() =>
      calculateGoldValue({
        // @ts-expect-error intentional missing field
        netWeight: undefined,
        goldRate: 40000,
        wastage: { type: "PERCENTAGE", wastagePercent: 5 },
      }),
    ).toThrow(/net weight is required/i);
  });

  it("rejects missing gold rate", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: 10,
        // @ts-expect-error intentional missing field
        goldRate: undefined,
        wastage: { type: "PERCENTAGE", wastagePercent: 5 },
      }),
    ).toThrow(/gold rate is required/i);
  });

  it("rejects missing wastage percent for PERCENTAGE type", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: 10,
        goldRate: 40000,
        // @ts-expect-error intentional missing field
        wastage: { type: "PERCENTAGE", wastagePercent: undefined },
      }),
    ).toThrow(/wastage percentage is required/i);
  });

  it("rejects non-numeric input", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: "not-a-number",
        goldRate: 40000,
        wastage: { type: "PERCENTAGE", wastagePercent: 5 },
      }),
    ).toThrow(GoldCalculationError);
  });

  it("rejects unrealistically large net weight", () => {
    expect(() =>
      calculateGoldValue({
        netWeight: 10_000_000,
        goldRate: 40000,
        wastage: { type: "PERCENTAGE", wastagePercent: 5 },
      }),
    ).toThrow(/unrealistically large/i);
  });

  it("exposes the offending field on the error", () => {
    try {
      calculateGoldValue({
        netWeight: 10,
        goldRate: 40000,
        wastage: { type: "FIXED_GRAMS", wastageGrams: -1 },
      });
      expect.fail("expected calculateGoldValue to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(GoldCalculationError);
      expect((error as GoldCalculationError).field).toBe("wastageGrams");
    }
  });
});

describe("calculateGoldValue — precision", () => {
  it("handles very small weights without precision loss", () => {
    const result = calculateGoldValue({
      netWeight: 0.001,
      goldRate: 40000,
      wastage: { type: "PERCENTAGE", wastagePercent: 5 },
    });
    // 0.001 * 5 / 100 = 0.00005
    expect(result.wastageWeight.toString()).toBe("0.00005");
    expect(n(result.grossWeight)).toBeCloseTo(0.00105, 8);
  });

  it("handles large weights precisely", () => {
    const result = calculateGoldValue({
      netWeight: 50000,
      goldRate: 40000,
      wastage: { type: "PERCENTAGE", wastagePercent: 5 },
    });
    expect(n(result.wastageWeight)).toBe(2500);
    expect(n(result.grossWeight)).toBe(52500);
    expect(n(result.goldValue)).toBe(2_100_000_000);
  });

  it("keeps 3+ decimal place weight precision intact (no float drift)", () => {
    const result = calculateGoldValue({
      netWeight: 12.375,
      goldRate: 40000,
      wastage: { type: "FIXED_GRAMS", wastageGrams: 0.125 },
    });
    // Plain JS floating point would show drift on 12.375 + 0.125; decimal.js must not.
    expect(result.grossWeight.toString()).toBe("12.5");
    expect(n(result.goldValue)).toBe(500000);
  });

  it("never uses native floating point for the classic 0.1 + 0.2 case", () => {
    const result = calculateGoldValue({
      netWeight: 0.1,
      goldRate: 100,
      wastage: { type: "FIXED_GRAMS", wastageGrams: 0.2 },
    });
    expect(result.grossWeight.toString()).toBe("0.3");
    expect(n(result.goldValue)).toBe(30);
  });

  it("does not prematurely round stored Decimal results", () => {
    const result = calculateGoldValue({
      netWeight: 3,
      goldRate: 1000,
      wastage: { type: "PERCENTAGE", wastagePercent: 33.333 },
    });
    // 3 * 33.333 / 100 = 0.99999 exactly — must not be rounded to 1.
    expect(result.wastageWeight.toString()).toBe("0.99999");
  });
});
