import { describe, expect, it } from "vitest";
import { formatWeight, formatWeightValue, formatCurrency, formatRatePerGram } from "@/lib/format";

describe("formatWeight", () => {
  it("always shows exactly 3 decimal places", () => {
    expect(formatWeight(10)).toBe("10.000 g");
    expect(formatWeight(1.25)).toBe("1.250 g");
    expect(formatWeight("25.375")).toBe("25.375 g");
  });

  it("rounds to 3 decimals only for display, half-up", () => {
    expect(formatWeightValue("10.5006")).toBe("10.501");
  });
});

describe("formatCurrency", () => {
  it("formats with thousands separators and an Rs. prefix", () => {
    expect(formatCurrency(420000)).toBe("Rs. 420,000");
    expect(formatCurrency(1_020_000)).toBe("Rs. 1,020,000");
  });

  it("rounds monetary values to 2 decimal places", () => {
    expect(formatCurrency(1234.567)).toBe("Rs. 1,234.57");
  });
});

describe("formatRatePerGram", () => {
  it("appends the /g suffix", () => {
    expect(formatRatePerGram(40000)).toBe("Rs. 40,000/g");
  });
});
