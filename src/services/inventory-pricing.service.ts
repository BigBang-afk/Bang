import Decimal from "decimal.js";

/**
 * Reusable inventory cost/profit pricing calculation.
 *
 * Pure, framework-agnostic business logic — same pattern as
 * gold-calculation.service.ts (no React, no Prisma, no HTTP). This service
 * is deliberately separate from the gold weight/value engine: callers first
 * get `goldValue` from `calculateGoldValue()` (src/services/gold-calculation.service.ts),
 * then pass it in here alongside the making/stone/diamond/other charges to
 * get the total cost and profit figures. Never duplicate either formula in
 * a UI component.
 *
 * Formulas:
 *   totalCost           = goldValue + makingCharge + stoneCharge + diamondCharge + otherCharge
 *   expectedProfit       = sellingPrice - totalCost
 *   profitMarginPercent = expectedProfit / sellingPrice * 100
 *
 * All arithmetic uses decimal.js — never native JavaScript floating point.
 * Results are not rounded here; only formatting code rounds for display.
 */

export class InventoryPricingError extends Error {
  readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = "InventoryPricingError";
    this.field = field;
  }
}

export type InventoryPricingInput = {
  goldValue: Decimal.Value;
  makingCharge?: Decimal.Value;
  stoneCharge?: Decimal.Value;
  diamondCharge?: Decimal.Value;
  otherCharge?: Decimal.Value;
  sellingPrice: Decimal.Value;
};

export type InventoryPricingResult = {
  goldValue: Decimal;
  makingCharge: Decimal;
  stoneCharge: Decimal;
  diamondCharge: Decimal;
  otherCharge: Decimal;
  totalCost: Decimal;
  sellingPrice: Decimal;
  expectedProfit: Decimal;
  profitMarginPercent: Decimal;
};

function toNonNegativeDecimal(
  value: Decimal.Value | undefined,
  field: string,
  label: string,
): Decimal {
  if (value === undefined || value === null || value === "") {
    return new Decimal(0);
  }
  let decimal: Decimal;
  try {
    decimal = new Decimal(value);
  } catch {
    throw new InventoryPricingError(`${label} must be a valid number.`, field);
  }
  if (!decimal.isFinite()) {
    throw new InventoryPricingError(`${label} must be a valid number.`, field);
  }
  if (decimal.lt(0)) {
    throw new InventoryPricingError(`${label} cannot be negative.`, field);
  }
  return decimal;
}

export function calculateInventoryPricing(
  input: InventoryPricingInput,
): InventoryPricingResult {
  const goldValue = toNonNegativeDecimal(input.goldValue, "goldValue", "Gold value");
  const makingCharge = toNonNegativeDecimal(input.makingCharge, "makingCharge", "Making charge");
  const stoneCharge = toNonNegativeDecimal(input.stoneCharge, "stoneCharge", "Stone charge");
  const diamondCharge = toNonNegativeDecimal(
    input.diamondCharge,
    "diamondCharge",
    "Diamond charge",
  );
  const otherCharge = toNonNegativeDecimal(input.otherCharge, "otherCharge", "Other charge");

  if (input.sellingPrice === undefined || input.sellingPrice === null || input.sellingPrice === "") {
    throw new InventoryPricingError("Selling price is required.", "sellingPrice");
  }
  let sellingPrice: Decimal;
  try {
    sellingPrice = new Decimal(input.sellingPrice);
  } catch {
    throw new InventoryPricingError("Selling price must be a valid number.", "sellingPrice");
  }
  if (!sellingPrice.isFinite()) {
    throw new InventoryPricingError("Selling price must be a valid number.", "sellingPrice");
  }
  if (sellingPrice.lte(0)) {
    throw new InventoryPricingError("Selling price must be greater than zero.", "sellingPrice");
  }

  const totalCost = goldValue
    .add(makingCharge)
    .add(stoneCharge)
    .add(diamondCharge)
    .add(otherCharge);

  const expectedProfit = sellingPrice.sub(totalCost);
  const profitMarginPercent = expectedProfit.div(sellingPrice).mul(100);

  return {
    goldValue,
    makingCharge,
    stoneCharge,
    diamondCharge,
    otherCharge,
    totalCost,
    sellingPrice,
    expectedProfit,
    profitMarginPercent,
  };
}
