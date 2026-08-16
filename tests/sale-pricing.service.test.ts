import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  calculateItemDiscount,
  calculateSaleTotals,
  validatePaymentsMatchGrandTotal,
  assertDiscountWithinLimit,
  effectiveDiscountPercent,
  SalePricingError,
} from "@/services/sale-pricing.service";

function n(value: Decimal): number {
  return value.toNumber();
}

describe("calculateItemDiscount — spec example", () => {
  it("Selling Price 500,000, Discount 20,000 -> Final Price 480,000", () => {
    const result = calculateItemDiscount({
      originalSellingPrice: 500000,
      discountType: "FIXED",
      discountValue: 20000,
    });
    expect(n(result.discountAmount)).toBe(20000);
    expect(n(result.finalPrice)).toBe(480000);
  });

  it("5% discount is calculated safely (no float drift)", () => {
    const result = calculateItemDiscount({
      originalSellingPrice: 500000,
      discountType: "PERCENTAGE",
      discountValue: 5,
    });
    expect(n(result.discountAmount)).toBe(25000);
    expect(n(result.finalPrice)).toBe(475000);
  });
});

describe("calculateItemDiscount — no discount", () => {
  it("defaults to zero discount when type/value omitted", () => {
    const result = calculateItemDiscount({ originalSellingPrice: 100000 });
    expect(n(result.discountAmount)).toBe(0);
    expect(n(result.finalPrice)).toBe(100000);
    expect(result.discountType).toBeNull();
  });

  it("treats a zero discount value as no discount", () => {
    const result = calculateItemDiscount({
      originalSellingPrice: 100000,
      discountType: "FIXED",
      discountValue: 0,
    });
    expect(result.discountType).toBeNull();
  });
});

describe("calculateItemDiscount — validation", () => {
  it("rejects a percentage discount over 100%", () => {
    expect(() =>
      calculateItemDiscount({ originalSellingPrice: 1000, discountType: "PERCENTAGE", discountValue: 150 }),
    ).toThrow(/cannot exceed 100/i);
  });

  it("rejects a fixed discount larger than the selling price", () => {
    expect(() =>
      calculateItemDiscount({ originalSellingPrice: 1000, discountType: "FIXED", discountValue: 1500 }),
    ).toThrow(/cannot exceed the selling price/i);
  });

  it("rejects a negative discount", () => {
    expect(() =>
      calculateItemDiscount({ originalSellingPrice: 1000, discountType: "FIXED", discountValue: -1 }),
    ).toThrow(/negative/i);
  });

  it("rejects a zero or negative selling price", () => {
    expect(() => calculateItemDiscount({ originalSellingPrice: 0 })).toThrow(SalePricingError);
    expect(() => calculateItemDiscount({ originalSellingPrice: -100 })).toThrow(SalePricingError);
  });
});

describe("assertDiscountWithinLimit / effectiveDiscountPercent", () => {
  it("computes the effective percent for a fixed discount", () => {
    const result = calculateItemDiscount({
      originalSellingPrice: 200000,
      discountType: "FIXED",
      discountValue: 20000,
    });
    expect(n(effectiveDiscountPercent(result))).toBe(10);
  });

  it("allows a discount within the role's limit", () => {
    const result = calculateItemDiscount({
      originalSellingPrice: 100000,
      discountType: "PERCENTAGE",
      discountValue: 5,
    });
    expect(() => assertDiscountWithinLimit(result, 10)).not.toThrow();
  });

  it("rejects a discount exceeding the role's limit (fixed discount expressed as percent)", () => {
    const result = calculateItemDiscount({
      originalSellingPrice: 100000,
      discountType: "FIXED",
      discountValue: 20000, // 20%
    });
    expect(() => assertDiscountWithinLimit(result, 10)).toThrow(/exceeds your maximum/i);
  });
});

describe("calculateSaleTotals — spec worked example", () => {
  it("subtotal, discount, tax, grand total", () => {
    const result = calculateSaleTotals({
      items: [
        { originalSellingPrice: 300000, discountAmount: 10000 },
        { originalSellingPrice: 200000, discountAmount: 10000 },
      ],
      taxPercent: 0,
    });
    expect(n(result.subtotal)).toBe(500000);
    expect(n(result.discount)).toBe(20000);
    expect(n(result.taxableAmount)).toBe(480000);
    expect(n(result.tax)).toBe(0);
    expect(n(result.grandTotal)).toBe(480000);
  });

  it("applies tax on the post-discount taxable amount when enabled", () => {
    const result = calculateSaleTotals({
      items: [{ originalSellingPrice: 100000, discountAmount: 0 }],
      taxPercent: 5,
    });
    expect(n(result.tax)).toBe(5000);
    expect(n(result.grandTotal)).toBe(105000);
  });

  it("defaults tax to zero when omitted (tax disabled by default)", () => {
    const result = calculateSaleTotals({
      items: [{ originalSellingPrice: 100000, discountAmount: 0 }],
    });
    expect(n(result.tax)).toBe(0);
    expect(n(result.grandTotal)).toBe(100000);
  });

  it("rejects an empty cart", () => {
    expect(() => calculateSaleTotals({ items: [] })).toThrow(/cart is empty/i);
  });

  it("rejects an invalid tax percentage", () => {
    expect(() =>
      calculateSaleTotals({ items: [{ originalSellingPrice: 100, discountAmount: 0 }], taxPercent: 150 }),
    ).toThrow(/between 0 and 100/i);
  });
});

describe("validatePaymentsMatchGrandTotal — spec worked example", () => {
  it("Cash 200,000 + Bank 200,000 + Credit 100,000 = Grand Total 500,000", () => {
    const summary = validatePaymentsMatchGrandTotal(
      [
        { method: "CASH", amount: 200000 },
        { method: "BANK_TRANSFER", amount: 200000 },
        { method: "CREDIT", amount: 100000 },
      ],
      500000,
    );
    expect(n(summary.paidAmount)).toBe(400000);
    expect(n(summary.balanceAmount)).toBe(100000);
    expect(n(summary.totalPayments)).toBe(500000);
  });

  it("full payment leaves zero balance", () => {
    const summary = validatePaymentsMatchGrandTotal([{ method: "CASH", amount: 500000 }], 500000);
    expect(n(summary.paidAmount)).toBe(500000);
    expect(n(summary.balanceAmount)).toBe(0);
  });

  it("full credit sale (nothing paid upfront)", () => {
    const summary = validatePaymentsMatchGrandTotal([{ method: "CREDIT", amount: 500000 }], 500000);
    expect(n(summary.paidAmount)).toBe(0);
    expect(n(summary.balanceAmount)).toBe(500000);
  });

  it("rejects underpayment (payments below grand total)", () => {
    expect(() =>
      validatePaymentsMatchGrandTotal([{ method: "CASH", amount: 400000 }], 500000),
    ).toThrow(/do not cover/i);
  });

  it("rejects overpayment (change due is not supported)", () => {
    expect(() =>
      validatePaymentsMatchGrandTotal([{ method: "CASH", amount: 600000 }], 500000),
    ).toThrow(/exceed/i);
  });

  it("rejects a zero or negative payment line", () => {
    expect(() =>
      validatePaymentsMatchGrandTotal([{ method: "CASH", amount: 0 }], 0),
    ).toThrow(/greater than zero/i);
  });

  it("rejects an empty payment list", () => {
    expect(() => validatePaymentsMatchGrandTotal([], 500000)).toThrow(/at least one payment/i);
  });
});

describe("precision", () => {
  it("never uses native floating point for split payments", () => {
    const summary = validatePaymentsMatchGrandTotal(
      [
        { method: "CASH", amount: 0.1 },
        { method: "CARD", amount: 0.2 },
      ],
      0.3,
    );
    expect(summary.totalPayments.toString()).toBe("0.3");
  });
});
