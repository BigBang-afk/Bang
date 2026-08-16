import "server-only";
import { prisma } from "@/lib/db/prisma";
import { formatBarcodeCode } from "@/lib/barcode-code";
import { getMaxDiscountPercentForRole, getTaxSettings } from "@/services/sales-settings.service";
import {
  calculateItemDiscount,
  calculateSaleTotals,
  validatePaymentsMatchGrandTotal,
  effectiveDiscountPercent,
} from "@/services/sale-pricing.service";
import type { SaleCartItemInput, SalePaymentInput } from "@/types/sales";

/**
 * Read-only, non-authoritative pricing preview for the New Sale screen —
 * every number here is recomputed server-side from the same functions
 * completeSale() uses, so the cashier never sees a total that could drift
 * from what checkout actually charges. See SALES.md "Live pricing preview".
 * Unlike completeSale(), invalid lines are reported inline rather than
 * thrown, since the cart is normal to be "in progress" while typing.
 */

export type CartItemPreview = {
  inventoryItemId: string;
  productName: string;
  barcodeCode: string | null;
  available: boolean;
  unavailableReason: string | null;
  originalSellingPrice: string;
  discountAmount: string;
  finalPrice: string;
  effectiveDiscountPercent: string;
  exceedsDiscountLimit: boolean;
};

export type CartPreview = {
  maxDiscountPercent: string;
  taxEnabled: boolean;
  taxPercent: string;
  items: CartItemPreview[];
  subtotal: string;
  discount: string;
  tax: string;
  grandTotal: string;
  allItemsValid: boolean;
};

export async function previewCart(
  items: SaleCartItemInput[],
  actingUser: { role: { name: string } },
): Promise<CartPreview> {
  const [maxDiscountPercent, taxSettings, inventoryItems] = await Promise.all([
    getMaxDiscountPercentForRole(actingUser.role.name),
    getTaxSettings(),
    prisma.inventoryItem.findMany({
      where: { id: { in: items.map((i) => i.inventoryItemId) } },
      include: { product: { select: { name: true } }, barcode: { select: { sequence: true } } },
    }),
  ]);

  const itemById = new Map(inventoryItems.map((item) => [item.id, item]));

  const previews: CartItemPreview[] = items.map((cartItem) => {
    const inv = itemById.get(cartItem.inventoryItemId);
    if (!inv) {
      return {
        inventoryItemId: cartItem.inventoryItemId,
        productName: "Unknown item",
        barcodeCode: null,
        available: false,
        unavailableReason: "This item could not be found.",
        originalSellingPrice: "0",
        discountAmount: "0",
        finalPrice: "0",
        effectiveDiscountPercent: "0",
        exceedsDiscountLimit: false,
      };
    }

    const barcodeCode = inv.barcode ? formatBarcodeCode(inv.barcode.sequence) : null;
    let unavailableReason: string | null = null;
    if (inv.archivedAt) unavailableReason = "This item has been archived.";
    else if (inv.status !== "IN_STOCK") unavailableReason = `Not available for sale (status: ${inv.status}).`;

    const discountResult = calculateItemDiscount({
      originalSellingPrice: inv.sellingPrice,
      discountType: cartItem.discountType ?? null,
      discountValue: cartItem.discountValue ?? null,
    });
    const effectivePercent = effectiveDiscountPercent(discountResult);

    return {
      inventoryItemId: inv.id,
      productName: inv.product.name,
      barcodeCode,
      available: unavailableReason === null,
      unavailableReason,
      originalSellingPrice: discountResult.originalSellingPrice.toString(),
      discountAmount: discountResult.discountAmount.toString(),
      finalPrice: discountResult.finalPrice.toString(),
      effectiveDiscountPercent: effectivePercent.toString(),
      exceedsDiscountLimit: effectivePercent.gt(maxDiscountPercent),
    };
  });

  const allItemsValid = previews.every((p) => p.available && !p.exceedsDiscountLimit);

  let subtotal = "0";
  let discount = "0";
  let tax = "0";
  let grandTotal = "0";
  if (previews.length > 0) {
    try {
      const totals = calculateSaleTotals({
        items: previews.map((p) => ({
          originalSellingPrice: p.originalSellingPrice,
          discountAmount: p.discountAmount,
        })),
        taxPercent: taxSettings.enabled ? taxSettings.percent : 0,
      });
      subtotal = totals.subtotal.toString();
      discount = totals.discount.toString();
      tax = totals.tax.toString();
      grandTotal = totals.grandTotal.toString();
    } catch {
      // Leave totals at "0" — a malformed line will already be flagged via
      // `available`/`exceedsDiscountLimit` above.
    }
  }

  return {
    maxDiscountPercent: maxDiscountPercent.toString(),
    taxEnabled: taxSettings.enabled,
    taxPercent: taxSettings.percent.toString(),
    items: previews,
    subtotal,
    discount,
    tax,
    grandTotal,
    allItemsValid,
  };
}

export type PaymentBalancePreview = {
  paidAmount: string;
  balanceAmount: string;
  totalPayments: string;
  isBalanced: boolean;
  error: string | null;
};

/** Live "does this set of payment lines add up?" check — same rule completeSale() enforces. */
export function previewPaymentBalance(
  payments: SalePaymentInput[],
  grandTotal: string,
): PaymentBalancePreview {
  if (payments.length === 0) {
    return { paidAmount: "0", balanceAmount: "0", totalPayments: "0", isBalanced: false, error: null };
  }
  try {
    const summary = validatePaymentsMatchGrandTotal(
      payments.map((p) => ({ method: p.method, amount: p.amount })),
      grandTotal,
    );
    return {
      paidAmount: summary.paidAmount.toString(),
      balanceAmount: summary.balanceAmount.toString(),
      totalPayments: summary.totalPayments.toString(),
      isBalanced: true,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payments do not balance.";
    return { paidAmount: "0", balanceAmount: "0", totalPayments: "0", isBalanced: false, error: message };
  }
}
