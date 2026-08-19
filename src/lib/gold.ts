import "server-only";
import { prisma } from "@/lib/prisma";
import type { GoldPurity } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

type Numeric = number | string | Prisma.Decimal;

/**
 * Single source of truth for jewellery pricing. The frontend NEVER computes
 * prices — it only displays what this module (or the API routes that call
 * it) returns. See task spec section 7/28: gold rate is dynamic and must
 * never be hard-coded into a product.
 */

export interface CurrentRates {
  K24: number | null;
  K21: number | null;
  K18: number | null;
  effectiveAt: Partial<Record<GoldPurity, Date>>;
}

/** Latest rate per purity (append-only history — never mutated). */
export async function getCurrentGoldRates(): Promise<CurrentRates> {
  const purities: GoldPurity[] = ["K24", "K21", "K18"];
  const result: CurrentRates = { K24: null, K21: null, K18: null, effectiveAt: {} };

  await Promise.all(
    purities.map(async (purity) => {
      const latest = await prisma.goldRate.findFirst({
        where: { purity },
        orderBy: { effectiveAt: "desc" },
      });
      if (latest) {
        result[purity] = Number(latest.ratePerGram);
        result.effectiveAt[purity] = latest.effectiveAt;
      }
    }),
  );

  return result;
}

export async function getCurrentGoldRateRecord(purity: GoldPurity) {
  return prisma.goldRate.findFirst({
    where: { purity },
    orderBy: { effectiveAt: "desc" },
  });
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export interface PriceBreakdownInputs {
  grossWeight: number;
  ratePerGram: number;
  makingCharges?: number;
  stoneCharges?: number;
  otherCharges?: number;
  discount?: number;
  taxPercent?: number;
  useExtras: boolean;
  precision?: number;
}

export interface PriceBreakdown {
  goldValue: number;
  makingCharges: number;
  stoneCharges: number;
  otherCharges: number;
  discount: number;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  finalPrice: number;
}

/**
 * Final Price = Gold Value + Making Charges + Stone Charges + Other Charges
 *               - Discount + Tax
 * Gold Value  = Gross Weight × Current Rate (for the product's purity)
 */
export function calculatePriceBreakdown(inputs: PriceBreakdownInputs): PriceBreakdown {
  const precision = inputs.precision ?? 2;
  const goldValue = inputs.grossWeight * inputs.ratePerGram;

  const makingCharges = inputs.useExtras ? inputs.makingCharges ?? 0 : 0;
  const stoneCharges = inputs.useExtras ? inputs.stoneCharges ?? 0 : 0;
  const otherCharges = inputs.useExtras ? inputs.otherCharges ?? 0 : 0;
  const discount = inputs.useExtras ? inputs.discount ?? 0 : 0;
  const taxPercent = inputs.useExtras ? inputs.taxPercent ?? 0 : 0;

  const subtotal = goldValue + makingCharges + stoneCharges + otherCharges - discount;
  const taxAmount = subtotal * (taxPercent / 100);
  const finalPrice = subtotal + taxAmount;

  return {
    goldValue: round(goldValue, precision),
    makingCharges: round(makingCharges, precision),
    stoneCharges: round(stoneCharges, precision),
    otherCharges: round(otherCharges, precision),
    discount: round(discount, precision),
    subtotal: round(subtotal, precision),
    taxPercent,
    taxAmount: round(taxAmount, precision),
    finalPrice: round(finalPrice, precision),
  };
}

export type PricedProduct =
  | { available: true; ratePerGram: number; effectiveAt: Date | null; breakdown: PriceBreakdown }
  | { available: false; reason: string };

interface ProductPriceFields {
  purity: GoldPurity;
  grossWeight: Numeric;
  makingCharges: Numeric;
  stoneCharges: Numeric;
  otherCharges: Numeric;
  discount: Numeric;
  taxPercent: Numeric;
}

/** Synchronous core used by both single-product and bulk pricing (no repeated DB hits). */
export function priceProductWithRates(
  product: ProductPriceFields,
  rates: CurrentRates,
  useExtras: boolean,
  precision: number,
): PricedProduct {
  const ratePerGram = rates[product.purity];
  if (ratePerGram == null) {
    return { available: false, reason: `No ${product.purity} gold rate has been set yet.` };
  }

  const breakdown = calculatePriceBreakdown({
    grossWeight: Number(product.grossWeight),
    ratePerGram,
    makingCharges: Number(product.makingCharges),
    stoneCharges: Number(product.stoneCharges),
    otherCharges: Number(product.otherCharges),
    discount: Number(product.discount),
    taxPercent: Number(product.taxPercent),
    useExtras,
    precision,
  });

  return {
    available: true,
    ratePerGram,
    effectiveAt: rates.effectiveAt[product.purity] ?? null,
    breakdown,
  };
}

/** Convenience: price a single product row (Prisma Product) against current rates. */
export async function priceProduct(product: ProductPriceFields): Promise<PricedProduct> {
  const [rates, settings] = await Promise.all([
    getCurrentGoldRates(),
    prisma.settings.findUnique({ where: { id: "singleton" } }),
  ]);

  return priceProductWithRates(
    product,
    rates,
    settings?.pricingUsesExtras ?? false,
    settings?.decimalPrecision ?? 2,
  );
}

/** Load rates + settings once, for pricing many products without N+1 queries. */
export async function getPricingContext() {
  const [rates, settings] = await Promise.all([
    getCurrentGoldRates(),
    prisma.settings.findUnique({ where: { id: "singleton" } }),
  ]);
  return {
    rates,
    useExtras: settings?.pricingUsesExtras ?? false,
    precision: settings?.decimalPrecision ?? 2,
  };
}
