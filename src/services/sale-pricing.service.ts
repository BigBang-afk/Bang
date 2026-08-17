import Decimal from "decimal.js";

/**
 * Sale-level pricing math: per-item discounts, sale totals (subtotal,
 * discount, tax, grand total), and payment-sum validation.
 *
 * Pure, framework-agnostic, same design as gold-calculation.service.ts and
 * inventory-pricing.service.ts — no React, no Prisma, no HTTP, decimal.js
 * throughout, no premature rounding. `<PosScreen>` calls the Server Action
 * wrapping these functions on every cart change for a live preview; the
 * checkout Server Action calls them again, server-side, as the
 * authoritative recalculation. See SALES.md.
 */

export class SalePricingError extends Error {
  readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = "SalePricingError";
    this.field = field;
  }
}

export type DiscountTypeValue = "PERCENTAGE" | "FIXED";

export type ItemDiscountInput = {
  originalSellingPrice: Decimal.Value;
  discountType?: DiscountTypeValue | null;
  discountValue?: Decimal.Value | null;
};

export type ItemDiscountResult = {
  originalSellingPrice: Decimal;
  discountType: DiscountTypeValue | null;
  discountValue: Decimal | null;
  discountAmount: Decimal;
  finalPrice: Decimal;
};

function toDecimalOrThrow(value: Decimal.Value, field: string, label: string): Decimal {
  let decimal: Decimal;
  try {
    decimal = new Decimal(value);
  } catch {
    throw new SalePricingError(`${label} must be a valid number.`, field);
  }
  if (!decimal.isFinite()) {
    throw new SalePricingError(`${label} must be a valid number.`, field);
  }
  return decimal;
}

/** Server-recalculates the discount/final price for one cart line — never trusts a client-submitted amount. */
export function calculateItemDiscount(input: ItemDiscountInput): ItemDiscountResult {
  const originalSellingPrice = toDecimalOrThrow(
    input.originalSellingPrice,
    "originalSellingPrice",
    "Selling price",
  );
  if (originalSellingPrice.lte(0)) {
    throw new SalePricingError("Selling price must be greater than zero.", "originalSellingPrice");
  }

  const hasDiscount =
    input.discountType != null &&
    input.discountValue != null &&
    !new Decimal(input.discountValue).isZero();

  if (!hasDiscount) {
    return {
      originalSellingPrice,
      discountType: null,
      discountValue: null,
      discountAmount: new Decimal(0),
      finalPrice: originalSellingPrice,
    };
  }

  const discountValue = toDecimalOrThrow(input.discountValue!, "discountValue", "Discount");
  if (discountValue.lt(0)) {
    throw new SalePricingError("Discount cannot be negative.", "discountValue");
  }

  let discountAmount: Decimal;
  if (input.discountType === "PERCENTAGE") {
    if (discountValue.gt(100)) {
      throw new SalePricingError("Discount percentage cannot exceed 100%.", "discountValue");
    }
    discountAmount = originalSellingPrice.mul(discountValue).div(100);
  } else if (input.discountType === "FIXED") {
    if (discountValue.gt(originalSellingPrice)) {
      throw new SalePricingError(
        "Fixed discount cannot exceed the selling price.",
        "discountValue",
      );
    }
    discountAmount = discountValue;
  } else {
    throw new SalePricingError("Invalid discount type.", "discountType");
  }

  return {
    originalSellingPrice,
    discountType: input.discountType!,
    discountValue,
    discountAmount,
    finalPrice: originalSellingPrice.sub(discountAmount),
  };
}

/** Effective discount percentage of a line, for comparing against a role's configured maximum. */
export function effectiveDiscountPercent(result: ItemDiscountResult): Decimal {
  if (result.originalSellingPrice.lte(0)) return new Decimal(0);
  return result.discountAmount.div(result.originalSellingPrice).mul(100);
}

export function assertDiscountWithinLimit(
  result: ItemDiscountResult,
  maxPercent: Decimal.Value,
): void {
  const max = new Decimal(maxPercent);
  const effective = effectiveDiscountPercent(result);
  if (effective.gt(max)) {
    throw new SalePricingError(
      `Discount of ${effective.toDecimalPlaces(2)}% exceeds your maximum allowed discount of ${max}%.`,
      "discountValue",
    );
  }
}

export type SaleTotalsInput = {
  items: { originalSellingPrice: Decimal.Value; discountAmount: Decimal.Value }[];
  /** Percentage, 0 when tax is disabled. */
  taxPercent?: Decimal.Value;
};

export type SaleTotalsResult = {
  subtotal: Decimal;
  discount: Decimal;
  taxableAmount: Decimal;
  taxPercent: Decimal;
  tax: Decimal;
  grandTotal: Decimal;
};

export function calculateSaleTotals(input: SaleTotalsInput): SaleTotalsResult {
  if (!input.items || input.items.length === 0) {
    throw new SalePricingError("The cart is empty.", "items");
  }

  let subtotal = new Decimal(0);
  let discount = new Decimal(0);
  for (const item of input.items) {
    const price = toDecimalOrThrow(item.originalSellingPrice, "items", "Item selling price");
    const itemDiscount = toDecimalOrThrow(item.discountAmount, "items", "Item discount");
    if (price.lte(0)) {
      throw new SalePricingError("Every cart item must have a positive selling price.", "items");
    }
    if (itemDiscount.lt(0) || itemDiscount.gt(price)) {
      throw new SalePricingError("An item's discount is invalid.", "items");
    }
    subtotal = subtotal.add(price);
    discount = discount.add(itemDiscount);
  }

  const taxPercent = toDecimalOrThrow(input.taxPercent ?? 0, "taxPercent", "Tax percentage");
  if (taxPercent.lt(0) || taxPercent.gt(100)) {
    throw new SalePricingError("Tax percentage must be between 0 and 100.", "taxPercent");
  }

  const taxableAmount = subtotal.sub(discount);
  const tax = taxableAmount.mul(taxPercent).div(100);
  const grandTotal = taxableAmount.add(tax);

  return { subtotal, discount, taxableAmount, taxPercent, tax, grandTotal };
}

export type PaymentLineInput = { method: string; amount: Decimal.Value };

export type PaymentSummary = {
  paidAmount: Decimal;
  balanceAmount: Decimal;
  totalPayments: Decimal;
};

/**
 * Sums payment lines (CREDIT counted separately as `balanceAmount`, per
 * SALES.md "Payments always sum to the grand total") and validates the
 * combined total matches `grandTotal` exactly — Phase 3 does not support
 * overpayment/change due, so any mismatch is rejected.
 */
export function validatePaymentsMatchGrandTotal(
  payments: PaymentLineInput[],
  grandTotal: Decimal.Value,
): PaymentSummary {
  if (!payments || payments.length === 0) {
    throw new SalePricingError("At least one payment line is required.", "payments");
  }

  let paidAmount = new Decimal(0);
  let balanceAmount = new Decimal(0);
  for (const payment of payments) {
    const amount = toDecimalOrThrow(payment.amount, "payments", "Payment amount");
    if (amount.lte(0)) {
      throw new SalePricingError("Every payment amount must be greater than zero.", "payments");
    }
    if (payment.method === "CREDIT") {
      balanceAmount = balanceAmount.add(amount);
    } else {
      paidAmount = paidAmount.add(amount);
    }
  }

  const totalPayments = paidAmount.add(balanceAmount);
  const total = new Decimal(grandTotal);
  if (!totalPayments.equals(total)) {
    const message = totalPayments.gt(total)
      ? "Total payments exceed the grand total — overpayment/change is not supported yet."
      : "Total payments do not cover the grand total.";
    throw new SalePricingError(message, "payments");
  }

  return { paidAmount, balanceAmount, totalPayments };
}
