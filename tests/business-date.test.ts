import { describe, expect, it } from "vitest";
import { toBusinessDate } from "@/lib/business-date";

describe("toBusinessDate", () => {
  it("normalizes a local date to UTC midnight for that calendar day", () => {
    const input = new Date(2026, 0, 15, 23, 45, 0); // Jan 15, 2026, local time
    const result = toBusinessDate(input);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(15);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
  });

  it("is idempotent when applied twice", () => {
    const once = toBusinessDate(new Date(2026, 5, 1, 10, 0, 0));
    const twice = toBusinessDate(once);
    expect(twice.getTime()).toBe(once.getTime());
  });
});
