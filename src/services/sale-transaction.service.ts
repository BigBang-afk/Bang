import "server-only";
import { prisma } from "@/lib/db/prisma";
import { recordStockMovement } from "@/services/stock-movement.service";
import { appendCustomerLedgerEntry } from "@/services/customer-ledger.service";
import { recordCashTransactionInTx } from "@/services/cash-transaction.service";
import { getMaxDiscountPercentForRole, getTaxSettings } from "@/services/sales-settings.service";
import { writeAuditLog } from "@/services/audit.service";
import { formatBarcodeCode } from "@/lib/barcode-code";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import {
  calculateItemDiscount,
  calculateSaleTotals,
  validatePaymentsMatchGrandTotal,
  assertDiscountWithinLimit,
  SalePricingError,
} from "@/services/sale-pricing.service";
import type { CompleteSaleInput, CompletedSale } from "@/types/sales";

/**
 * Completing a sale is the single highest-stakes write path in the app —
 * see SALES.md "Sale transaction" for the full 14-step flow this
 * implements. Every price, discount, and total is recalculated here from
 * the InventoryItem's own stored (already-frozen) fields; nothing from the
 * client is trusted except *which* items and *how much* discount/payment
 * was requested.
 */

export class InventoryUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryUnavailableError";
  }
}

export class CustomerNotFoundError extends Error {
  constructor() {
    super("Selected customer could not be found.");
    this.name = "CustomerNotFoundError";
  }
}

export async function completeSale(
  input: CompleteSaleInput,
  actingUser: { id: string; role: { name: string } },
): Promise<CompletedSale> {
  if (!input.items || input.items.length === 0) {
    throw new SalePricingError("The cart is empty.", "items");
  }

  const seenIds = new Set<string>();
  for (const item of input.items) {
    if (seenIds.has(item.inventoryItemId)) {
      throw new SalePricingError("The same item appears twice in the cart.", "items");
    }
    seenIds.add(item.inventoryItemId);
  }

  if (input.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new CustomerNotFoundError();
  }

  const [maxDiscountPercent, taxSettings, inventoryItems] = await Promise.all([
    getMaxDiscountPercentForRole(actingUser.role.name),
    getTaxSettings(),
    prisma.inventoryItem.findMany({
      where: { id: { in: Array.from(seenIds) } },
      include: { product: true, barcode: true },
    }),
  ]);

  const itemById = new Map(inventoryItems.map((item) => [item.id, item]));
  if (itemById.size !== seenIds.size) {
    throw new InventoryUnavailableError("One or more selected items could not be found.");
  }

  const preparedItems = input.items.map((cartItem) => {
    const inv = itemById.get(cartItem.inventoryItemId)!;
    const label = inv.barcode ? formatBarcodeCode(inv.barcode.sequence) : inv.id;
    if (inv.archivedAt) {
      throw new InventoryUnavailableError(`${inv.product.name} (${label}) has been archived.`);
    }
    if (inv.status !== "IN_STOCK") {
      throw new InventoryUnavailableError(
        `${inv.product.name} (${label}) is not available for sale (status: ${inv.status}).`,
      );
    }

    const discountResult = calculateItemDiscount({
      originalSellingPrice: inv.sellingPrice,
      discountType: cartItem.discountType ?? null,
      discountValue: cartItem.discountValue ?? null,
    });
    assertDiscountWithinLimit(discountResult, maxDiscountPercent);

    return { inv, discountResult };
  });

  const totals = calculateSaleTotals({
    items: preparedItems.map((p) => ({
      originalSellingPrice: p.discountResult.originalSellingPrice,
      discountAmount: p.discountResult.discountAmount,
    })),
    taxPercent: taxSettings.enabled ? taxSettings.percent : 0,
  });

  const paymentSummary = validatePaymentsMatchGrandTotal(
    input.payments.map((p) => ({ method: p.method, amount: p.amount })),
    totals.grandTotal,
  );

  if (paymentSummary.balanceAmount.gt(0) && !input.customerId) {
    throw new SalePricingError(
      "A customer must be selected to extend credit — walk-in sales must be paid in full.",
      "customerId",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        customerId: input.customerId || null,
        subtotal: totals.subtotal.toString(),
        discount: totals.discount.toString(),
        tax: totals.tax.toString(),
        grandTotal: totals.grandTotal.toString(),
        paidAmount: paymentSummary.paidAmount.toString(),
        balanceAmount: paymentSummary.balanceAmount.toString(),
        status: "COMPLETED",
        createdById: actingUser.id,
      },
    });

    for (const { inv, discountResult } of preparedItems) {
      // Atomic re-check-and-set: the authoritative defense against two
      // cashiers selling the same unique item at once. See SALES.md
      // "Concurrency".
      const updated = await tx.inventoryItem.updateMany({
        where: { id: inv.id, status: "IN_STOCK", archivedAt: null },
        data: { status: "SOLD" },
      });
      if (updated.count !== 1) {
        throw new InventoryUnavailableError(
          `${inv.product.name} was just sold or is no longer available. Refresh and try again.`,
        );
      }

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          inventoryItemId: inv.id,
          productName: inv.product.name,
          barcodeCode: inv.barcode ? formatBarcodeCode(inv.barcode.sequence) : "",
          purity: inv.purity,
          netWeight: inv.netWeight,
          wastageType: inv.wastageType,
          wastagePercent: inv.wastagePercent,
          wastageWeight: inv.wastageWeight,
          grossWeight: inv.grossWeight,
          goldRatePerGram: inv.goldRatePerGram,
          goldValue: inv.goldValue,
          makingCharge: inv.makingCharge,
          stoneCharge: inv.stoneCharge,
          diamondCharge: inv.diamondCharge,
          otherCharge: inv.otherCharge,
          originalSellingPrice: discountResult.originalSellingPrice.toString(),
          discountType: discountResult.discountType,
          discountValue: discountResult.discountValue ? discountResult.discountValue.toString() : null,
          discountAmount: discountResult.discountAmount.toString(),
          finalPrice: discountResult.finalPrice.toString(),
        },
      });

      await recordStockMovement(tx, {
        inventoryItemId: inv.id,
        movementType: "STOCK_SOLD",
        previousStatus: "IN_STOCK",
        newStatus: "SOLD",
        weight: inv.grossWeight,
        userId: actingUser.id,
        saleId: sale.id,
      });
    }

    for (const payment of input.payments) {
      await tx.payment.create({
        data: {
          saleId: sale.id,
          method: payment.method,
          amount: payment.amount,
          reference: payment.reference || null,
          notes: payment.notes || null,
          createdById: actingUser.id,
        },
      });

      // CREDIT isn't a cash movement — nothing physically changed hands.
      // See CASH-MANAGEMENT.md.
      if (payment.method !== "CREDIT") {
        await recordCashTransactionInTx(tx, {
          transactionType: "SALE_PAYMENT",
          direction: "IN",
          amount: payment.amount,
          paymentMethod: payment.method,
          referenceType: "Sale",
          referenceId: sale.id,
          description: "Sale payment at checkout",
          createdById: actingUser.id,
        });
      }
    }

    // A sale associated with a customer always posts to their ledger — a
    // SALE debit for the full grand total, and a PAYMENT credit for
    // whatever was actually paid at checkout — even when the sale is paid
    // in full (netting to a zero balance change) and even for a walk-in
    // sale with no customer (which never touches the ledger at all,
    // since it has no customerId). See CUSTOMER-LEDGER.md "Ledger logic".
    if (input.customerId) {
      await appendCustomerLedgerEntry(tx, {
        customerId: input.customerId,
        transactionType: "SALE",
        referenceType: "Sale",
        referenceId: sale.id,
        debit: totals.grandTotal.toString(),
        description: "Sale",
        createdById: actingUser.id,
      });
      if (paymentSummary.paidAmount.gt(0)) {
        await appendCustomerLedgerEntry(tx, {
          customerId: input.customerId,
          transactionType: "PAYMENT",
          referenceType: "Sale",
          referenceId: sale.id,
          credit: paymentSummary.paidAmount.toString(),
          description: "Payment at checkout",
          createdById: actingUser.id,
        });
      }
    }

    const invoice = await tx.invoice.create({ data: { saleId: sale.id } });

    return { sale, invoice };
  });

  const invoiceNumber = formatInvoiceNumber(result.invoice.sequence);

  await writeAuditLog({
    userId: actingUser.id,
    action: "SALE_COMPLETED",
    entity: "Sale",
    entityId: result.sale.id,
    metadata: {
      invoiceNumber,
      itemCount: preparedItems.length,
      grandTotal: totals.grandTotal.toString(),
      customerId: input.customerId ?? null,
    },
  });
  if (totals.discount.gt(0)) {
    await writeAuditLog({
      userId: actingUser.id,
      action: "DISCOUNT_APPLIED",
      entity: "Sale",
      entityId: result.sale.id,
      metadata: { totalDiscount: totals.discount.toString() },
    });
  }
  for (const payment of input.payments) {
    await writeAuditLog({
      userId: actingUser.id,
      action: "PAYMENT_CREATED",
      entity: "Sale",
      entityId: result.sale.id,
      metadata: { method: payment.method, amount: payment.amount },
    });
  }
  await writeAuditLog({
    userId: actingUser.id,
    action: "INVOICE_GENERATED",
    entity: "Invoice",
    entityId: result.invoice.id,
    metadata: { invoiceNumber, saleId: result.sale.id },
  });

  return { id: result.sale.id, invoiceNumber, grandTotal: totals.grandTotal.toString() };
}
