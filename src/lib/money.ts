import { Prisma } from "@prisma/client";

export const Decimal = Prisma.Decimal;
export type DecimalInput = Prisma.Decimal.Value;

/**
 * The single most important calculation in the app:
 * USD amount -> PKR value -> 24K gold gram equivalent.
 *
 * PKR = USD * usdToPkrRate
 * Gold Grams = PKR / goldPricePerGramPkr
 */
export function convertUsdToPkrAndGold(
  usdAmount: DecimalInput,
  usdToPkrRate: DecimalInput,
  goldPricePerGramPkr: DecimalInput
) {
  const usd = new Prisma.Decimal(usdAmount);
  const rate = new Prisma.Decimal(usdToPkrRate);
  const goldPrice = new Prisma.Decimal(goldPricePerGramPkr);

  const pkr = usd.mul(rate);
  const grams = goldPrice.isZero() ? new Prisma.Decimal(0) : pkr.div(goldPrice);

  return { usd, pkr, grams };
}

export function convertPkrToUsd(pkrAmount: DecimalInput, usdToPkrRate: DecimalInput) {
  const pkr = new Prisma.Decimal(pkrAmount);
  const rate = new Prisma.Decimal(usdToPkrRate);
  if (rate.isZero()) return new Prisma.Decimal(0);
  return pkr.div(rate);
}

export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
}

// --- Client-safe plain-number versions (for live previews in forms) ---

export function previewUsdToPkrAndGold(usd: number, rate: number, goldPrice: number) {
  const pkr = usd * rate;
  const grams = goldPrice === 0 ? 0 : pkr / goldPrice;
  return { usd, pkr, grams };
}

export function formatUsd(value: number, opts: { showSign?: boolean } = {}): string {
  const sign = opts.showSign && value > 0 ? "+" : "";
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : sign}$${formatted}`;
}

export function formatPkr(value: number, opts: { showSign?: boolean } = {}): string {
  const sign = opts.showSign && value > 0 ? "+" : "";
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${value < 0 ? "-" : sign}Rs. ${formatted}`;
}

export function formatGrams(value: number, opts: { valueOnly?: boolean } = {}): string {
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  return opts.valueOnly ? formatted : `${formatted} g`;
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}
