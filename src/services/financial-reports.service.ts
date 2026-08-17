import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { getBusinessTimezone, getReceivableAgingBucketDays } from "@/services/financial-settings.service";
import { resolveReportDateRange, type ReportDatePreset } from "@/lib/report-date-range";
import { getCashBalanceAsOf, getHistoricalSystemGoldWeight } from "@/services/historical-balance.service";
import { getSystemGoldWeightForPurity, listGoldWithKarigars, listGoldWithSuppliers } from "@/services/gold-ledger.service";
import { listAllCashPayables } from "@/services/party-cash-ledger.service";
import { getEffectiveRatesForDate } from "@/services/gold-rate.service";
import { getTodayBusinessDate } from "@/lib/business-date";
import { derivePurchasePaymentStatus, type PurchasePaymentStatusValue } from "@/types/purchases";
import { formatCustomerCode } from "@/lib/customer-code";
import { Prisma } from "@/generated/prisma/client";
import type { GoldPurity, PaymentMethod } from "@/generated/prisma/client";
import { GOLD_PURITIES } from "@/types/gold";

/**
 * Server-side aggregated financial reports — see FINANCIAL-REPORTS.md.
 * Every report reads and aggregates existing Phase 1-5 tables; nothing here
 * introduces a new source of truth for money already tracked elsewhere. See
 * ACCOUNTING.md "Sources of truth".
 */

// ---------------------------------------------------------------------------
// Sales Report
// ---------------------------------------------------------------------------

export type SalesReportFilters = {
  cashierId?: string;
  customerId?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
};

export type SalesReport = {
  from: string;
  to: string;
  grossSales: string;
  discounts: string;
  netSales: string;
  invoiceCount: number;
  itemsSold: number;
  averageInvoiceValue: string;
  cashSales: string;
  cardSales: string;
  bankSales: string;
  creditSales: string;
  refunds: string;
  goldSoldByPurity: { purity: GoldPurity; weight: string }[];
};

export async function getSalesReport(
  preset: ReportDatePreset,
  custom: { from: Date; to: Date } | undefined,
  filters: SalesReportFilters = {},
): Promise<SalesReport> {
  const timezone = await getBusinessTimezone();
  const { from, to } = resolveReportDateRange(preset, timezone, custom);

  const saleFilter: Prisma.SaleWhereInput = {
    saleDate: { gte: from, lte: to },
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.cashierId ? { createdById: filters.cashierId } : {}),
    ...(filters.paymentMethod ? { payments: { some: { method: filters.paymentMethod } } } : {}),
  };

  const itemWhere: Prisma.SaleItemWhereInput = {
    sale: saleFilter,
    OR: [{ return: null }, { return: { status: { not: "RETURNED" } } }],
    ...(filters.categoryId ? { inventoryItem: { product: { categoryId: filters.categoryId } } } : {}),
  };

  const [agg, distinctSales, goldByPurity, paymentsByMethod, refundAgg] = await Promise.all([
    prisma.saleItem.aggregate({
      where: itemWhere,
      _sum: { originalSellingPrice: true, discountAmount: true, finalPrice: true },
      _count: true,
    }),
    prisma.saleItem.findMany({ where: itemWhere, select: { saleId: true }, distinct: ["saleId"] }),
    prisma.saleItem.groupBy({ by: ["purity"], where: itemWhere, _sum: { grossWeight: true } }),
    prisma.payment.groupBy({ by: ["method"], where: { sale: saleFilter }, _sum: { amount: true } }),
    prisma.saleItem.aggregate({
      where: {
        sale: { saleDate: { gte: from, lte: to } },
        return: { status: "RETURNED", processedAt: { gte: from, lte: to } },
        ...(filters.categoryId ? { inventoryItem: { product: { categoryId: filters.categoryId } } } : {}),
      },
      _sum: { finalPrice: true },
    }),
  ]);

  const netSales = new Decimal(agg._sum.finalPrice ?? 0);
  const invoiceCount = distinctSales.length;
  const byMethod = new Map(paymentsByMethod.map((p) => [p.method, new Decimal(p._sum.amount ?? 0)]));

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    grossSales: new Decimal(agg._sum.originalSellingPrice ?? 0).toString(),
    discounts: new Decimal(agg._sum.discountAmount ?? 0).toString(),
    netSales: netSales.toString(),
    invoiceCount,
    itemsSold: agg._count,
    averageInvoiceValue: invoiceCount > 0 ? netSales.div(invoiceCount).toDecimalPlaces(2).toString() : "0",
    cashSales: (byMethod.get("CASH") ?? new Decimal(0)).toString(),
    cardSales: (byMethod.get("CARD") ?? new Decimal(0)).toString(),
    bankSales: (byMethod.get("BANK_TRANSFER") ?? new Decimal(0)).toString(),
    creditSales: (byMethod.get("CREDIT") ?? new Decimal(0)).toString(),
    refunds: new Decimal(refundAgg._sum.finalPrice ?? 0).toString(),
    goldSoldByPurity: goldByPurity.map((g) => ({ purity: g.purity, weight: new Decimal(g._sum.grossWeight ?? 0).toString() })),
  };
}

// ---------------------------------------------------------------------------
// Purchase Report
// ---------------------------------------------------------------------------

export type PurchaseReportFilters = {
  supplierId?: string;
  categoryId?: string;
  purity?: GoldPurity;
  paymentStatus?: PurchasePaymentStatusValue;
};

export type PurchaseReport = {
  from: string;
  to: string;
  purchaseCount: number;
  totalPurchaseCost: string;
  amountPaid: string;
  outstandingPayable: string;
  itemsPurchased: number;
  goldPurchasedByPurity: { purity: GoldPurity; weight: string }[];
};

export async function getPurchaseReport(
  preset: ReportDatePreset,
  custom: { from: Date; to: Date } | undefined,
  filters: PurchaseReportFilters = {},
): Promise<PurchaseReport> {
  const timezone = await getBusinessTimezone();
  const { from, to } = resolveReportDateRange(preset, timezone, custom);

  const purchaseWhere: Prisma.PurchaseWhereInput = {
    purchaseDate: { gte: from, lte: to },
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.categoryId || filters.purity
      ? {
          items: {
            some: {
              ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
              ...(filters.purity ? { purity: filters.purity } : {}),
            },
          },
        }
      : {}),
  };

  let purchases = await prisma.purchase.findMany({
    where: purchaseWhere,
    select: { id: true, paidAmount: true, balanceAmount: true, grandTotal: true },
  });

  if (filters.paymentStatus) {
    purchases = purchases.filter(
      (p) => derivePurchasePaymentStatus(p.paidAmount.toString(), p.grandTotal.toString()) === filters.paymentStatus,
    );
  }

  const purchaseIds = purchases.map((p) => p.id);
  const itemWhere: Prisma.PurchaseItemWhereInput = {
    purchaseId: { in: purchaseIds },
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.purity ? { purity: filters.purity } : {}),
  };

  const [itemCount, goldByPurity] = await Promise.all([
    purchaseIds.length > 0 ? prisma.purchaseItem.count({ where: itemWhere }) : 0,
    purchaseIds.length > 0
      ? prisma.purchaseItem.groupBy({ by: ["purity"], where: itemWhere, _sum: { grossWeight: true } })
      : [],
  ]);

  const totals = purchases.reduce(
    (acc, p) => ({
      cost: acc.cost.add(p.grandTotal.toString()),
      paid: acc.paid.add(p.paidAmount.toString()),
      payable: acc.payable.add(p.balanceAmount.toString()),
    }),
    { cost: new Decimal(0), paid: new Decimal(0), payable: new Decimal(0) },
  );

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    purchaseCount: purchases.length,
    totalPurchaseCost: totals.cost.toString(),
    amountPaid: totals.paid.toString(),
    outstandingPayable: totals.payable.toString(),
    itemsPurchased: itemCount,
    goldPurchasedByPurity: goldByPurity.map((g) => ({ purity: g.purity, weight: new Decimal(g._sum.grossWeight ?? 0).toString() })),
  };
}

// ---------------------------------------------------------------------------
// Expense Report
// ---------------------------------------------------------------------------

export type ExpenseReport = {
  from: string;
  to: string;
  totalExpenses: string;
  byCategory: { categoryId: string; categoryName: string; total: string; count: number }[];
  byPaymentMethod: { paymentMethod: PaymentMethod; total: string; count: number }[];
};

export async function getExpenseReport(
  preset: ReportDatePreset,
  custom?: { from: Date; to: Date },
): Promise<ExpenseReport> {
  const timezone = await getBusinessTimezone();
  const { from, to } = resolveReportDateRange(preset, timezone, custom);
  const where: Prisma.ExpenseWhereInput = { status: "ACTIVE", expenseDate: { gte: from, lte: to } };

  const [totalAgg, byCategoryGroup, byMethodGroup, categories] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["categoryId"], where, _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({ by: ["paymentMethod"], where, _sum: { amount: true }, _count: true }),
    prisma.expenseCategory.findMany({ select: { id: true, name: true } }),
  ]);

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    totalExpenses: new Decimal(totalAgg._sum.amount ?? 0).toString(),
    byCategory: byCategoryGroup
      .map((g) => ({
        categoryId: g.categoryId,
        categoryName: categoryNames.get(g.categoryId) ?? "Unknown",
        total: new Decimal(g._sum.amount ?? 0).toString(),
        count: g._count,
      }))
      .sort((a, b) => Number(b.total) - Number(a.total)),
    byPaymentMethod: byMethodGroup.map((g) => ({
      paymentMethod: g.paymentMethod,
      total: new Decimal(g._sum.amount ?? 0).toString(),
      count: g._count,
    })),
  };
}

// ---------------------------------------------------------------------------
// Cash Report
// ---------------------------------------------------------------------------

export type CashReport = {
  from: string;
  to: string;
  openingCash: string;
  cashIn: string;
  cashOut: string;
  expectedClosing: string;
  physicalClosing: string | null;
  difference: string | null;
  byType: { transactionType: string; direction: "IN" | "OUT"; total: string; count: number }[];
};

export async function getCashReport(preset: ReportDatePreset, custom?: { from: Date; to: Date }): Promise<CashReport> {
  const timezone = await getBusinessTimezone();
  const { from, to } = resolveReportDateRange(preset, timezone, custom);

  const [opening, inAgg, outAgg, grouped, latestReconciliation] = await Promise.all([
    getCashBalanceAsOf(from),
    prisma.cashTransaction.aggregate({ where: { direction: "IN", createdAt: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.cashTransaction.aggregate({ where: { direction: "OUT", createdAt: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.cashTransaction.groupBy({
      by: ["transactionType", "direction"],
      where: { createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.cashReconciliation.findFirst({ where: { createdAt: { gte: from, lte: to } }, orderBy: { createdAt: "desc" } }),
  ]);

  const cashIn = new Decimal(inAgg._sum.amount ?? 0);
  const cashOut = new Decimal(outAgg._sum.amount ?? 0);
  const expectedClosing = opening.add(cashIn).sub(cashOut);
  const physicalClosing = latestReconciliation ? latestReconciliation.physicalAmount.toString() : null;

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    openingCash: opening.toString(),
    cashIn: cashIn.toString(),
    cashOut: cashOut.toString(),
    expectedClosing: expectedClosing.toString(),
    physicalClosing,
    difference: physicalClosing ? new Decimal(physicalClosing).sub(expectedClosing).toString() : null,
    byType: grouped.map((g) => ({
      transactionType: g.transactionType,
      direction: g.direction,
      total: new Decimal(g._sum.amount ?? 0).toString(),
      count: g._count,
    })),
  };
}

// ---------------------------------------------------------------------------
// Gold Report
// ---------------------------------------------------------------------------

export type GoldReportRow = {
  purity: GoldPurity;
  openingGold: string;
  goldPurchased: string;
  goldReceived: string;
  goldGiven: string;
  goldSold: string;
  goldReturned: string;
  goldAdjustments: string;
  closingGold: string;
};

export async function getGoldReport(preset: ReportDatePreset, custom?: { from: Date; to: Date }): Promise<{
  from: string;
  to: string;
  rows: GoldReportRow[];
}> {
  const timezone = await getBusinessTimezone();
  const { from, to } = resolveReportDateRange(preset, timezone, custom);
  const rangeEndExclusive = new Date(to.getTime() + 1);
  const isCurrentRange = rangeEndExclusive.getTime() >= Date.now();

  const rows = await Promise.all(
    GOLD_PURITIES.map(async (purity) => {
      const p = purity as GoldPurity;
      const [opening, closing, sold, purchased, ledgerRows] = await Promise.all([
        getHistoricalSystemGoldWeight(p, from),
        isCurrentRange ? getSystemGoldWeightForPurity(p) : getHistoricalSystemGoldWeight(p, rangeEndExclusive),
        prisma.saleItem.aggregate({
          where: {
            purity: p,
            sale: { saleDate: { gte: from, lte: to } },
            OR: [{ return: null }, { return: { status: { not: "RETURNED" } } }],
          },
          _sum: { grossWeight: true },
        }),
        prisma.purchaseItem.aggregate({
          where: { purity: p, purchase: { purchaseDate: { gte: from, lte: to } } },
          _sum: { grossWeight: true },
        }),
        prisma.goldLedgerEntry.groupBy({
          by: ["transactionType"],
          where: { purity: p, createdAt: { gte: from, lte: to } },
          _sum: { debit: true, credit: true },
        }),
      ]);

      const byType = new Map(ledgerRows.map((r) => [r.transactionType, r]));
      const given = new Decimal(byType.get("GOLD_GIVEN")?._sum.debit ?? 0);
      const received = new Decimal(byType.get("GOLD_RECEIVED")?._sum.credit ?? 0);
      const returned = new Decimal(byType.get("GOLD_RETURNED")?._sum.debit ?? 0);
      const adjustmentsEntry = byType.get("GOLD_ADJUSTMENT");
      const adjustments = new Decimal(adjustmentsEntry?._sum.debit ?? 0).sub(new Decimal(adjustmentsEntry?._sum.credit ?? 0));

      return {
        purity: p,
        openingGold: opening.toString(),
        goldPurchased: new Decimal(purchased._sum.grossWeight ?? 0).toString(),
        goldReceived: received.toString(),
        goldGiven: given.toString(),
        goldSold: new Decimal(sold._sum.grossWeight ?? 0).toString(),
        goldReturned: returned.toString(),
        goldAdjustments: adjustments.toString(),
        closingGold: closing.toString(),
      };
    }),
  );

  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), rows };
}

// ---------------------------------------------------------------------------
// Receivable Aging Report
// ---------------------------------------------------------------------------

export type ReceivableAgingRow = {
  customerId: string;
  customerCode: string;
  name: string;
  outstandingBalance: string;
  ageDays: number;
  bucket: string;
  lastPaymentAt: Date | null;
};

/**
 * Customer-level aging (not per-invoice): CustomerPayment isn't allocated to
 * a specific Sale (see CUSTOMER-LEDGER.md), so the existing architecture
 * only supports a running per-customer balance, not per-invoice tracking —
 * a deliberate, documented scope decision, not an oversight. `ageDays` is a
 * proxy: days since the customer's most recent Sale.
 */
export async function getReceivableAgingReport(): Promise<{ buckets: number[]; rows: ReceivableAgingRow[] }> {
  const [buckets, customers] = await Promise.all([
    getReceivableAgingBucketDays(),
    prisma.customer.findMany({
      where: { outstandingBalance: { gt: 0 } },
      select: {
        id: true,
        customerCode: true,
        firstName: true,
        lastName: true,
        outstandingBalance: true,
        sales: { orderBy: { saleDate: "desc" }, take: 1, select: { saleDate: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
  ]);

  const now = Date.now();
  const rows: ReceivableAgingRow[] = customers.map((c) => {
    const lastSaleAt = c.sales[0]?.saleDate ?? null;
    const ageDays = lastSaleAt ? Math.max(0, Math.floor((now - lastSaleAt.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    return {
      customerId: c.id,
      customerCode: formatCustomerCode(c.customerCode),
      name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
      outstandingBalance: c.outstandingBalance.toString(),
      ageDays,
      bucket: classifyAgeBucket(ageDays, buckets),
      lastPaymentAt: c.payments[0]?.createdAt ?? null,
    };
  });

  return { buckets, rows: rows.sort((a, b) => b.ageDays - a.ageDays) };
}

function classifyAgeBucket(ageDays: number, buckets: number[]): string {
  const [b1, b2, b3] = buckets;
  if (ageDays <= b1) return "Current";
  if (ageDays <= b2) return `1-${b2}`;
  if (ageDays <= b3) return `${b2 + 1}-${b3}`;
  return `${b3}+`;
}

// ---------------------------------------------------------------------------
// Payable Report (cash) + Gold Obligation Report
// ---------------------------------------------------------------------------

export type PayableReportRow = {
  partyType: "KARIGAR" | "SUPPLIER";
  partyId: string;
  partyCode: string;
  name: string;
  payable: string;
  ageDays: number;
};

export async function getPayableReport(): Promise<PayableReportRow[]> {
  const payables = await listAllCashPayables();
  const now = Date.now();

  const rows = await Promise.all(
    payables.map(async (p) => {
      const latest = await prisma.partyCashLedgerEntry.findFirst({
        where: { partyType: p.partyType, partyId: p.partyId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const ageDays = latest ? Math.max(0, Math.floor((now - latest.createdAt.getTime()) / (1000 * 60 * 60 * 24))) : 0;
      return { partyType: p.partyType, partyId: p.partyId, partyCode: p.partyCode, name: p.name, payable: p.payable, ageDays };
    }),
  );

  return rows.sort((a, b) => b.ageDays - a.ageDays);
}

/** Gold held with each party, by purity — kept structurally separate from cash payables/receivables, never converted to a rupee figure. */
export async function getGoldObligationReport() {
  const [karigars, suppliers] = await Promise.all([listGoldWithKarigars(), listGoldWithSuppliers()]);
  return { karigars, suppliers };
}

// ---------------------------------------------------------------------------
// Inventory Valuation
// ---------------------------------------------------------------------------

export type InventoryValuationBreakdown = {
  key: string;
  label: string;
  itemCount: number;
  costValue: string;
  sellingValue: string;
};

export type InventoryValuationReport = {
  totalItems: number;
  costValue: string;
  sellingValue: string;
  expectedGrossProfit: string;
  byCategory: InventoryValuationBreakdown[];
  byPurity: InventoryValuationBreakdown[];
  bySupplier: InventoryValuationBreakdown[];
  byAge: InventoryValuationBreakdown[];
};

const ACTIVE_STOCK_WHERE = { archivedAt: null, status: { not: "SOLD" as const } };

export async function getInventoryValuationReport(): Promise<InventoryValuationReport> {
  const items = await prisma.inventoryItem.findMany({
    where: ACTIVE_STOCK_WHERE,
    select: {
      id: true,
      purity: true,
      totalCost: true,
      sellingPrice: true,
      createdAt: true,
      product: { select: { category: { select: { id: true, name: true } } } },
      supplier: { select: { id: true, name: true } },
    },
  });

  const totalCost = items.reduce((sum, i) => sum.add(i.totalCost.toString()), new Decimal(0));
  const totalSelling = items.reduce((sum, i) => sum.add(i.sellingPrice.toString()), new Decimal(0));

  const byCategory = groupValuation(items, (i) => ({ key: i.product.category.id, label: i.product.category.name }));
  const byPurity = groupValuation(items, (i) => ({ key: i.purity, label: i.purity }));
  const bySupplier = groupValuation(
    items.filter((i) => i.supplier),
    (i) => ({ key: i.supplier!.id, label: i.supplier!.name }),
  );

  const now = Date.now();
  const byAge = groupValuation(items, (i) => {
    const days = Math.floor((now - i.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const bucket = days <= 30 ? "0-30 days" : days <= 90 ? "31-90 days" : days <= 180 ? "91-180 days" : "180+ days";
    return { key: bucket, label: bucket };
  });

  return {
    totalItems: items.length,
    costValue: totalCost.toString(),
    sellingValue: totalSelling.toString(),
    expectedGrossProfit: totalSelling.sub(totalCost).toString(),
    byCategory,
    byPurity,
    bySupplier,
    byAge,
  };
}

function groupValuation<T extends { totalCost: Prisma.Decimal; sellingPrice: Prisma.Decimal }>(
  items: T[],
  keyOf: (item: T) => { key: string; label: string },
): InventoryValuationBreakdown[] {
  const map = new Map<string, InventoryValuationBreakdown>();
  for (const item of items) {
    const { key, label } = keyOf(item);
    const existing = map.get(key);
    if (existing) {
      existing.itemCount += 1;
      existing.costValue = new Decimal(existing.costValue).add(item.totalCost.toString()).toString();
      existing.sellingValue = new Decimal(existing.sellingValue).add(item.sellingPrice.toString()).toString();
    } else {
      map.set(key, { key, label, itemCount: 1, costValue: item.totalCost.toString(), sellingValue: item.sellingPrice.toString() });
    }
  }
  return [...map.values()].sort((a, b) => Number(b.costValue) - Number(a.costValue));
}

export type CurrentMarketValuationRow = {
  purity: GoldPurity;
  itemCount: number;
  grossWeight: string;
  todayRatePerGram: string | null;
  currentGoldValue: string | null;
  nonGoldCharges: string;
  currentMarketValue: string | null;
  originalCostValue: string;
};

/**
 * Recomputes ONLY the raw gold-value portion of current stock using TODAY's
 * effective rate — making/stone/diamond/other charges are never
 * rate-dependent, so they're carried over as originally recorded. Clearly
 * labeled and returned separately from `getInventoryValuationReport`'s
 * `costValue` (the historical, as-recorded figure) — never conflated. See
 * FINANCIAL-REPORTS.md "Current market value".
 */
export async function getInventoryCurrentMarketValuation(): Promise<CurrentMarketValuationRow[]> {
  const [items, todayRates] = await Promise.all([
    prisma.inventoryItem.groupBy({
      by: ["purity"],
      where: ACTIVE_STOCK_WHERE,
      _sum: { grossWeight: true, makingCharge: true, stoneCharge: true, diamondCharge: true, otherCharge: true, totalCost: true },
      _count: true,
    }),
    getEffectiveRatesForDate(getTodayBusinessDate()),
  ]);

  const rateByPurity = new Map(todayRates.map((r) => [r.purity, r.ratePerGram]));

  return items.map((group) => {
    const rate = rateByPurity.get(group.purity);
    const grossWeight = new Decimal(group._sum.grossWeight ?? 0);
    const nonGoldCharges = new Decimal(group._sum.makingCharge ?? 0)
      .add(new Decimal(group._sum.stoneCharge ?? 0))
      .add(new Decimal(group._sum.diamondCharge ?? 0))
      .add(new Decimal(group._sum.otherCharge ?? 0));
    const currentGoldValue = rate ? grossWeight.mul(rate.toString()) : null;

    return {
      purity: group.purity,
      itemCount: group._count,
      grossWeight: grossWeight.toString(),
      todayRatePerGram: rate ? rate.toString() : null,
      currentGoldValue: currentGoldValue ? currentGoldValue.toString() : null,
      nonGoldCharges: nonGoldCharges.toString(),
      currentMarketValue: currentGoldValue ? currentGoldValue.add(nonGoldCharges).toString() : null,
      originalCostValue: new Decimal(group._sum.totalCost ?? 0).toString(),
    };
  });
}
