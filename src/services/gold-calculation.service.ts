import Decimal from "decimal.js";
import type { PricingMode, WastageType } from "@/types/gold";

/**
 * Jewelry Weight Calculation Engine.
 *
 * Pure, framework-agnostic business logic — no React, no Prisma, no HTTP.
 * Import this from Server Actions/Route Handlers to compute authoritative
 * values, and from client components only for instant UI previews. The
 * server-side call is always the source of truth for money.
 *
 * All arithmetic uses decimal.js so results are exact for base-10 money and
 * weight values — never plain JavaScript floating point. Results are NOT
 * rounded here; only formatting code (src/lib/format.ts) rounds for display,
 * per the "don't prematurely round stored values" rule.
 *
 * Core formulas:
 *   wastageWeight (percentage) = netWeight * wastagePercent / 100
 *   grossWeight                = netWeight + wastageWeight
 *   goldValue (MODE_A / MODE_B) = grossWeight * goldRate
 *   goldValue (MODE_C)          = netWeight * goldRate + makingCharges
 */

export class GoldCalculationError extends Error {
  readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = "GoldCalculationError";
    this.field = field;
  }
}

export type WastageInput =
  | { type: "PERCENTAGE"; wastagePercent: Decimal.Value }
  | { type: "FIXED_GRAMS"; wastageGrams: Decimal.Value };

export type GoldCalculationInput = {
  netWeight: Decimal.Value;
  goldRate: Decimal.Value;
  wastage: WastageInput;
  pricingMode?: PricingMode;
  /** Only used when pricingMode is MODE_C. */
  makingCharges?: Decimal.Value;
};

export type GoldCalculationResult = {
  netWeight: Decimal;
  wastageType: WastageType;
  wastagePercent: Decimal | null;
  wastageWeight: Decimal;
  grossWeight: Decimal;
  goldRate: Decimal;
  makingCharges: Decimal | null;
  pricingMode: PricingMode;
  goldValue: Decimal;
};

const MAX_WEIGHT_GRAMS = 1_000_000; // 1 tonne — sanity ceiling against fat-finger input.

function toDecimalOrThrow(value: Decimal.Value | undefined, field: string, label: string): Decimal {
  if (value === undefined || value === null || value === "") {
    throw new GoldCalculationError(`${label} is required.`, field);
  }
  let decimal: Decimal;
  try {
    decimal = new Decimal(value);
  } catch {
    throw new GoldCalculationError(`${label} must be a valid number.`, field);
  }
  if (!decimal.isFinite()) {
    throw new GoldCalculationError(`${label} must be a valid number.`, field);
  }
  return decimal;
}

export function calculateGoldValue(input: GoldCalculationInput): GoldCalculationResult {
  const netWeight = toDecimalOrThrow(input.netWeight, "netWeight", "Net weight");
  if (netWeight.lte(0)) {
    throw new GoldCalculationError("Net weight must be greater than zero.", "netWeight");
  }
  if (netWeight.gt(MAX_WEIGHT_GRAMS)) {
    throw new GoldCalculationError("Net weight is unrealistically large.", "netWeight");
  }

  const goldRate = toDecimalOrThrow(input.goldRate, "goldRate", "Gold rate");
  if (goldRate.lte(0)) {
    throw new GoldCalculationError("Gold rate must be greater than zero.", "goldRate");
  }

  if (!input.wastage) {
    throw new GoldCalculationError("Wastage details are required.", "wastage");
  }

  let wastageType: WastageType;
  let wastagePercent: Decimal | null = null;
  let wastageWeight: Decimal;

  if (input.wastage.type === "PERCENTAGE") {
    wastageType = "PERCENTAGE";
    wastagePercent = toDecimalOrThrow(
      input.wastage.wastagePercent,
      "wastagePercent",
      "Wastage percentage",
    );
    if (wastagePercent.lt(0) || wastagePercent.gt(100)) {
      throw new GoldCalculationError(
        "Wastage percentage must be between 0 and 100.",
        "wastagePercent",
      );
    }
    wastageWeight = netWeight.mul(wastagePercent).div(100);
  } else if (input.wastage.type === "FIXED_GRAMS") {
    wastageType = "FIXED_GRAMS";
    wastageWeight = toDecimalOrThrow(
      input.wastage.wastageGrams,
      "wastageGrams",
      "Wastage weight",
    );
    if (wastageWeight.lt(0)) {
      throw new GoldCalculationError("Wastage weight must be zero or greater.", "wastageGrams");
    }
  } else {
    throw new GoldCalculationError("Invalid wastage type.", "wastage");
  }

  const grossWeight = netWeight.add(wastageWeight);

  const pricingMode: PricingMode = input.pricingMode ?? "MODE_A";
  let makingCharges: Decimal | null = null;
  let goldValue: Decimal;

  switch (pricingMode) {
    case "MODE_A":
    case "MODE_B":
      goldValue = grossWeight.mul(goldRate);
      break;
    case "MODE_C": {
      makingCharges = input.makingCharges
        ? toDecimalOrThrow(input.makingCharges, "makingCharges", "Making charges")
        : new Decimal(0);
      if (makingCharges.lt(0)) {
        throw new GoldCalculationError("Making charges cannot be negative.", "makingCharges");
      }
      goldValue = netWeight.mul(goldRate).add(makingCharges);
      break;
    }
    default:
      throw new GoldCalculationError("Invalid pricing mode.", "pricingMode");
  }

  return {
    netWeight,
    wastageType,
    wastagePercent,
    wastageWeight,
    grossWeight,
    goldRate,
    makingCharges,
    pricingMode,
    goldValue,
  };
}
