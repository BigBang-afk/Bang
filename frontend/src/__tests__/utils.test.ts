import { describe, expect, it } from "vitest";

import { formatCountdown, formatPrice } from "@/lib/utils";

describe("formatCountdown", () => {
  it("formats whole minutes and seconds as mm:ss", () => {
    expect(formatCountdown(58_000)).toBe("00:58");
    expect(formatCountdown(125_000)).toBe("02:05");
  });

  it("never goes negative", () => {
    expect(formatCountdown(-5000)).toBe("00:00");
  });

  it("rounds up partial seconds so the display never hits 00:00 early", () => {
    expect(formatCountdown(500)).toBe("00:01");
  });
});

describe("formatPrice", () => {
  it("formats with the given pip precision", () => {
    expect(formatPrice(1.08501234, 5)).toBe("1.08501");
  });

  it("renders a placeholder for missing prices", () => {
    expect(formatPrice(null)).toBe("--");
  });
});
