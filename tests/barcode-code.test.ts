import { describe, expect, it } from "vitest";
import { formatBarcodeCode, parseBarcodeCode } from "@/lib/barcode-code";

describe("formatBarcodeCode", () => {
  it("zero-pads to 6 digits with the ZJ- prefix", () => {
    expect(formatBarcodeCode(1)).toBe("ZJ-000001");
    expect(formatBarcodeCode(42)).toBe("ZJ-000042");
    expect(formatBarcodeCode(123456)).toBe("ZJ-123456");
  });

  it("does not truncate sequences beyond 6 digits", () => {
    expect(formatBarcodeCode(1234567)).toBe("ZJ-1234567");
  });
});

describe("parseBarcodeCode", () => {
  it("parses a well-formed code", () => {
    expect(parseBarcodeCode("ZJ-000001")).toBe(1);
    expect(parseBarcodeCode("ZJ-123456")).toBe(123456);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(parseBarcodeCode("  zj-000042  ")).toBe(42);
  });

  it("accepts a bare numeric sequence without the prefix", () => {
    expect(parseBarcodeCode("42")).toBe(42);
  });

  it("round-trips with formatBarcodeCode", () => {
    for (const sequence of [1, 42, 999999, 1000000]) {
      expect(parseBarcodeCode(formatBarcodeCode(sequence))).toBe(sequence);
    }
  });

  it("returns null for garbage input", () => {
    expect(parseBarcodeCode("not-a-barcode")).toBeNull();
    expect(parseBarcodeCode("ZJ-abc123")).toBeNull();
    expect(parseBarcodeCode("")).toBeNull();
    expect(parseBarcodeCode("ZJ-")).toBeNull();
  });

  it("returns null for zero or negative sequences", () => {
    expect(parseBarcodeCode("ZJ-000000")).toBeNull();
    expect(parseBarcodeCode("-5")).toBeNull();
  });
});
