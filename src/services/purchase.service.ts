import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { calculateGoldValue } from "@/services/gold-calculation.service";
import { createInventoryItemInTx, writeInventoryItemCreatedAuditLogs } from "@/services/inventory-item.service";
import { appendPartyCashLedgerEntry } from "@/services/party-cash-ledger.service";
import { recordCashTransactionInTx } from "@/services/cash-transaction.service";
import { writeAuditLog } from "@/services/audit.service";
import { formatPurchaseNumber, parsePurchaseNumber } from "@/lib/purchase-number";
import type { CreatePurchaseInput } from "@/types/purchases";
import { Prisma } from "@/generated/prisma/client";
import type { GoldPurity, PurchaseStatus } from "@/generated/prisma/client";

const WEIGHT_DP = 3;
const MONEY_DP = 2;

function roundDp(value: Decimal, dp: number): Decimal {
  return value.toDecimalPlaces(dp, Decimal.ROUND_HALF_UP);
}

export class SupplierNotFoundForPurchaseError extends Error {
  constructor() {
    super("Selected supplier could not be found.");
    this.name = "SupplierNotFoundForPurchaseError";
  }
}

export class EmptyPurchaseError extends Error {
  constructor() {
    super("A purchase must have at least one item.");
    this.name = "EmptyPurchaseError";
  }
}

export class PurchaseOverpaymentError extends Error {
  constructor() {
    super("Payments cannot exceed the purchase's grand total.");
    this.name = "PurchaseOverpaymentError";
  }
}

export class MissingSellingPriceError extends Error {
  constructor(productName: string) {
    super(`"${productName}" is marked to add to inventory but has no selling price.`);
    this.name = "MissingSellingPriceError";
  }
}

/**
 * The purchase transaction engine — validate supplier -> compute each
 * item's weight/gold value (reusing the Phase 1 calculation engine, never
 * re-implemented) -> compute totals -> one `$transaction`: create
 * Purchase/PurchaseItem rows, optionally push items into inventory
 * (composing inventory-item.service.ts's transactional primitive so
 * inventory creation rolls back with everything else), create
 * PurchasePayment rows + CashTransaction rows, post the supplier's cash
 * ledger (PURCHASE debit + PAYMENT credit, exactly the SALE/PAYMENT
 * pattern sale-transaction.service.ts established for customers) -> audit
 * log after commit. See PURCHASE-SYSTEM.md.
 */
export async function createPurchase(
  input: CreatePurchaseInput,
  userId: string,
): Promise<{ purchaseId: string; purchaseNumber: string }> {
  if (input.items.length === 0) throw new EmptyPurchaseError();

  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId }, select: { id: true } });
  if (!supplier) throw new SupplierNotFoundForPurchaseError();

  const computedItems = input.items.map((item) => {
    if (item.addToInventory && (item.sellingPrice === undefined || item.sellingPrice <= 0)) {
      throw new MissingSellingPriceError(item.productName);
    }
    const goldCalc = calculateGoldValue({
      netWeight: item.netWeight,
      goldRate: item.goldRate,
      wastage:
        item.wastageType === "PERCENTAGE"
          ? { type: "PERCENTAGE", wastagePercent: item.wastagePercent ?? 0 }
          : { type: "FIXED_GRAMS", wastageGrams: item.wastageGrams ?? 0 },
    });
    const makingCharge = new Decimal(item.makingCharge ?? 0);
    const stoneCharge = new Decimal(item.stoneCharge ?? 0);
    const diamondCharge = new Decimal(item.diamondCharge ?? 0);
    const otherCharge = new Decimal(item.otherCharge ?? 0);
    const charges = makingCharge.add(stoneCharge).add(diamondCharge).add(otherCharge);
    const totalCost = roundDp(goldCalc.goldValue.add(charges), MONEY_DP);

    return { input: item, goldCalc, makingCharge, stoneCharge, diamondCharge, otherCharge, totalCost };
  });

  const subtotal = computedItems.reduce((sum, c) => sum.add(roundDp(c.goldCalc.goldValue, MONEY_DP)), new Decimal(0));
  const totalCharges = computedItems.reduce(
    (sum, c) => sum.add(c.makingCharge).add(c.stoneCharge).add(c.diamondCharge).add(c.otherCharge),
    new Decimal(0),
  );
  const grandTotal = computedItems.reduce((sum, c) => sum.add(c.totalCost), new Decimal(0));

  for (const payment of input.payments) {
    if (!(payment.amount > 0)) throw new PurchaseOverpaymentError();
  }
  const paidAmount = input.payments.reduce((sum, p) => sum.add(p.amount), new Decimal(0));
  if (paidAmount.gt(grandTotal)) throw new PurchaseOverpaymentError();
  const balanceAmount = grandTotal.sub(paidAmount);

  const result = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        supplierId: input.supplierId,
        purchaseDate: input.purchaseDate ?? new Date(),
        referenceNumber: input.referenceNumber || null,
        subtotal: subtotal.toString(),
        totalCharges: totalCharges.toString(),
        grandTotal: grandTotal.toString(),
        paidAmount: paidAmount.toString(),
        balanceAmount: balanceAmount.toString(),
        notes: input.notes || null,
        createdById: userId,
      },
    });

    const inventoryResults: { result: Awaited<ReturnType<typeof createInventoryItemInTx>>; productName: string }[] = [];

    for (const c of computedItems) {
      const netWeight = roundDp(c.goldCalc.netWeight, WEIGHT_DP);
      const wastageWeight = roundDp(c.goldCalc.wastageWeight, WEIGHT_DP);
      const grossWeight = roundDp(c.goldCalc.grossWeight, WEIGHT_DP);
      const wastagePercent = c.goldCalc.wastagePercent ? roundDp(c.goldCalc.wastagePercent, WEIGHT_DP) : null;

      const purchaseItem = await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productName: c.input.productName,
          categoryId: c.input.categoryId || null,
          purity: c.input.purity,
          netWeight: netWeight.toString(),
          wastageType: c.input.wastageType,
          wastagePercent: wastagePercent ? wastagePercent.toString() : null,
          wastageWeight: wastageWeight.toString(),
          grossWeight: grossWeight.toString(),
          goldRatePerGram: c.goldCalc.goldRate.toString(),
          goldValue: roundDp(c.goldCalc.goldValue, MONEY_DP).toString(),
          makingCharge: c.makingCharge.toString(),
          stoneCharge: c.stoneCharge.toString(),
          diamondCharge: c.diamondCharge.toString(),
          otherCharge: c.otherCharge.toString(),
          totalCost: c.totalCost.toString(),
          notes: c.input.notes || null,
        },
      });

      if (c.input.addToInventory) {
        const inventoryResult = await createInventoryItemInTx(
          tx,
          {
            productName: c.input.productName,
            categoryId: c.input.categoryId ?? "",
            purity: c.input.purity,
            netWeight: c.input.netWeight,
            goldRate: c.input.goldRate,
            wastageType: c.input.wastageType,
            wastagePercent: c.input.wastagePercent,
            wastageGrams: c.input.wastageGrams,
            makingCharge: c.input.makingCharge,
            stoneCharge: c.input.stoneCharge,
            diamondCharge: c.input.diamondCharge,
            otherCharge: c.input.otherCharge,
            sellingPrice: c.input.sellingPrice!,
            confirmLowerPrice: true,
            source: "PURCHASED",
            supplierId: input.supplierId,
            purchaseItemId: purchaseItem.id,
          },
          userId,
        );
        inventoryResults.push({ result: inventoryResult, productName: c.input.productName });
      }
    }

    for (const payment of input.payments) {
      await tx.purchasePayment.create({
        data: {
          purchaseId: purchase.id,
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference || null,
          notes: payment.notes || null,
          createdById: userId,
        },
      });

      await recordCashTransactionInTx(tx, {
        transactionType: "PURCHASE_PAYMENT",
        direction: "OUT",
        amount: payment.amount,
        paymentMethod: payment.method,
        referenceType: "Purchase",
        referenceId: purchase.id,
        description: "Purchase payment",
        createdById: userId,
      });
    }

    // The supplier cash ledger mirrors the customer ledger's SALE/PAYMENT
    // pattern exactly, from the opposite side: a PURCHASE debit for the
    // full grand total (what the business now owes), then a PAYMENT credit
    // for whatever was actually paid — even a fully-paid purchase posts
    // both, netting to zero but leaving a complete trail. See
    // CASH-MANAGEMENT.md "Supplier cash ledger".
    await appendPartyCashLedgerEntry(tx, {
      partyType: "SUPPLIER",
      partyId: input.supplierId,
      transactionType: "PURCHASE",
      debit: grandTotal.toString(),
      referenceType: "Purchase",
      referenceId: purchase.id,
      description: "Purchase",
      createdById: userId,
    });
    if (paidAmount.gt(0)) {
      await appendPartyCashLedgerEntry(tx, {
        partyType: "SUPPLIER",
        partyId: input.supplierId,
        transactionType: "PAYMENT",
        credit: paidAmount.toString(),
        referenceType: "Purchase",
        referenceId: purchase.id,
        description: "Payment at purchase",
        createdById: userId,
      });
    }

    return { purchase, inventoryResults };
  });

  const purchaseNumber = formatPurchaseNumber(result.purchase.sequence);

  await writeAuditLog({
    userId,
    action: "PURCHASE_CREATED",
    entity: "Purchase",
    entityId: result.purchase.id,
    metadata: {
      purchaseNumber,
      supplierId: input.supplierId,
      grandTotal: grandTotal.toString(),
      itemCount: input.items.length,
    },
  });
  for (const { result: inventoryResult, productName } of result.inventoryResults) {
    await writeInventoryItemCreatedAuditLogs(inventoryResult, productName, userId);
  }

  return { purchaseId: result.purchase.id, purchaseNumber };
}

export type PurchaseListRow = {
  id: string;
  purchaseNumber: string;
  purchaseDate: Date;
  supplierName: string;
  supplierId: string;
  itemCount: number;
  grossWeight: string;
  grandTotal: string;
  paidAmount: string;
  balanceAmount: string;
  status: PurchaseStatus;
};

const PURCHASE_LIST_SELECT = {
  id: true,
  sequence: true,
  purchaseDate: true,
  grandTotal: true,
  paidAmount: true,
  balanceAmount: true,
  status: true,
  supplier: { select: { id: true, name: true } },
  items: { select: { grossWeight: true } },
} satisfies Prisma.PurchaseSelect;

function toPurchaseListRow(
  row: Prisma.PurchaseGetPayload<{ select: typeof PURCHASE_LIST_SELECT }>,
): PurchaseListRow {
  const grossWeight = row.items.reduce((sum, i) => sum.add(i.grossWeight), new Prisma.Decimal(0));
  return {
    id: row.id,
    purchaseNumber: formatPurchaseNumber(row.sequence),
    purchaseDate: row.purchaseDate,
    supplierName: row.supplier.name,
    supplierId: row.supplier.id,
    itemCount: row.items.length,
    grossWeight: grossWeight.toString(),
    grandTotal: row.grandTotal.toString(),
    paidAmount: row.paidAmount.toString(),
    balanceAmount: row.balanceAmount.toString(),
    status: row.status,
  };
}

export type PurchaseListFilters = {
  search?: string;
  supplierId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  paymentStatus?: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  sort?: "NEWEST" | "OLDEST" | "AMOUNT_HIGH" | "BALANCE_HIGH";
  page?: number;
  pageSize?: number;
};

export async function listPurchases(
  filters: PurchaseListFilters,
): Promise<{ rows: PurchaseListRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const parsedNumber = filters.search ? parsePurchaseNumber(filters.search.trim()) : null;
  const where: Prisma.PurchaseWhereInput = {
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? { purchaseDate: { gte: filters.dateFrom, lte: filters.dateTo } }
      : {}),
    ...(filters.paymentStatus === "UNPAID" ? { paidAmount: { lte: 0 } } : {}),
    ...(filters.paymentStatus === "PAID" ? { balanceAmount: { lte: 0 } } : {}),
    ...(filters.paymentStatus === "PARTIALLY_PAID"
      ? { AND: [{ paidAmount: { gt: 0 } }, { balanceAmount: { gt: 0 } }] }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { referenceNumber: { contains: filters.search, mode: "insensitive" } },
            { supplier: { name: { contains: filters.search, mode: "insensitive" } } },
            ...(parsedNumber !== null ? [{ sequence: parsedNumber }] : []),
          ],
        }
      : {}),
  };

  const orderBy: Prisma.PurchaseOrderByWithRelationInput =
    filters.sort === "OLDEST"
      ? { purchaseDate: "asc" }
      : filters.sort === "AMOUNT_HIGH"
        ? { grandTotal: "desc" }
        : filters.sort === "BALANCE_HIGH"
          ? { balanceAmount: "desc" }
          : { purchaseDate: "desc" };

  const [rows, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      select: PURCHASE_LIST_SELECT,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchase.count({ where }),
  ]);

  return { rows: rows.map(toPurchaseListRow), total };
}

const PURCHASE_DETAIL_INCLUDE = {
  supplier: true,
  createdBy: { select: { id: true, name: true } },
  items: { include: { category: true, inventoryItem: { select: { id: true, barcode: true } } } },
  payments: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.PurchaseInclude;

export type PurchaseDetail = Prisma.PurchaseGetPayload<{ include: typeof PURCHASE_DETAIL_INCLUDE }>;

export async function getPurchaseById(id: string): Promise<PurchaseDetail | null> {
  return prisma.purchase.findUnique({ where: { id }, include: PURCHASE_DETAIL_INCLUDE });
}

export type PurchaseSummary = {
  totalPurchases: string;
  purchaseCount: number;
  totalPaid: string;
  totalPayable: string;
  byPurity: { purity: GoldPurity; totalWeight: string }[];
};

/** The Purchase Summary report — real aggregates, no placeholder figures. */
export async function getPurchaseSummary(): Promise<PurchaseSummary> {
  const [totals, weightByPurity] = await Promise.all([
    prisma.purchase.aggregate({ _sum: { grandTotal: true, paidAmount: true, balanceAmount: true }, _count: true }),
    prisma.purchaseItem.groupBy({ by: ["purity"], _sum: { grossWeight: true } }),
  ]);

  return {
    totalPurchases: (totals._sum.grandTotal ?? new Prisma.Decimal(0)).toString(),
    purchaseCount: totals._count,
    totalPaid: (totals._sum.paidAmount ?? new Prisma.Decimal(0)).toString(),
    totalPayable: (totals._sum.balanceAmount ?? new Prisma.Decimal(0)).toString(),
    byPurity: weightByPurity.map((w) => ({
      purity: w.purity,
      totalWeight: (w._sum.grossWeight ?? new Prisma.Decimal(0)).toString(),
    })),
  };
}
