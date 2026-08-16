import { describe, expect, it } from "vitest";
import { formatInvoiceNumber, parseInvoiceNumber } from "@/lib/invoice-number";

describe("formatInvoiceNumber", () => {
  it("zero-pads to 6 digits with the ZJ-INV- prefix", () => {
    expect(formatInvoiceNumber(1)).toBe("ZJ-INV-000001");
    expect(formatInvoiceNumber(42)).toBe("ZJ-INV-000042");
    expect(formatInvoiceNumber(123456)).toBe("ZJ-INV-123456");
  });

  it("does not truncate sequences beyond 6 digits", () => {
    expect(formatInvoiceNumber(1234567)).toBe("ZJ-INV-1234567");
  });
});

describe("parseInvoiceNumber", () => {
  it("parses a well-formed invoice number", () => {
    expect(parseInvoiceNumber("ZJ-INV-000001")).toBe(1);
    expect(parseInvoiceNumber("ZJ-INV-123456")).toBe(123456);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(parseInvoiceNumber("  zj-inv-000042  ")).toBe(42);
  });

  it("accepts a bare numeric sequence without the prefix", () => {
    expect(parseInvoiceNumber("42")).toBe(42);
  });

  it("round-trips with formatInvoiceNumber", () => {
    for (const sequence of [1, 42, 999999, 1000000]) {
      expect(parseInvoiceNumber(formatInvoiceNumber(sequence))).toBe(sequence);
    }
  });

  it("returns null for garbage input", () => {
    expect(parseInvoiceNumber("not-an-invoice")).toBeNull();
    expect(parseInvoiceNumber("ZJ-INV-abc123")).toBeNull();
    expect(parseInvoiceNumber("")).toBeNull();
  });

  it("returns null for zero or negative sequences", () => {
    expect(parseInvoiceNumber("ZJ-INV-000000")).toBeNull();
    expect(parseInvoiceNumber("-5")).toBeNull();
  });

  it("does not confuse an invoice number with a barcode", () => {
    expect(parseInvoiceNumber("ZJ-000001")).toBeNull();
  });
});
