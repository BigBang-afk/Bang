import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { getCurrentBusinessDate, getFlagUnpaidBalancesOnClosing } from "@/services/financial-settings.service";
import { getLatestCashReconciliation, getLatestGoldReconciliationByPurity } from "@/services/reconciliation.service";
import { getCashBalanceAsOf, getHistoricalTotalReceivable, getHistoricalTotalPartyPayable } from "@/services/historical-balance.service";
import { Prisma } from "@/generated/prisma/client";
import type { DailyClosingStatus, GoldPurity } from "@/generated/prisma/client";
import { GOLD_PURITIES } from "@/types/gold";

/**
 * Daily cash + business closing — see DAILY-CLOSING.md. Deliberately does
 * NOT duplicate any transaction: every figure shown is aggregated live from
 * Sale/Payment/Expense/CustomerLedgerEntry/PartyCashLedgerEntry/
 * GoldLedgerEntry/CashTransaction at read time. The only genuinely new data
 * a closing introduces is the physical cash count and the closing decision
 * itself (status/timestamps/reason).
 */

function dayBounds(businessDate: Date): { start: Date; end: Date } {
  const start = new Date(businessDate);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

export type DailyClosingSalesSection = {
  totalSales: string;
  cashSales: string;
  cardSales: string;
  bankSales: string;
  creditSales: string;
  refunds: string;
};

async function buildSalesSection(start: Date, end: Date): Promise<DailyClosingSalesSection> {
  const [salesAgg, paymentsByMethod, refundAgg] = await Promise.all([
    prisma.sale.aggregate({ where: { saleDate: { gte: start, lte: end } }, _sum: { grandTotal: true } }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { sale: { saleDate: { gte: start, lte: end } } },
      _sum: { amount: true },
    }),
    prisma.saleItem.aggregate({
      where: { return: { status: "RETURNED", processedAt: { gte: start, lte: end } } },
      _sum: { finalPrice: true },
    }),
  ]);

  const byMethod = new Map(paymentsByMethod.map((p) => [p.method, new Decimal(p._sum.amount ?? 0)]));

  return {
    totalSales: new Decimal(salesAgg._sum.grandTotal ?? 0).toString(),
    cashSales: (byMethod.get("CASH") ?? new Decimal(0)).toString(),
    cardSales: (byMethod.get("CARD") ?? new Decimal(0)).toString(),
    bankSales: (byMethod.get("BANK_TRANSFER") ?? new Decimal(0)).toString(),
    creditSales: (byMethod.get("CREDIT") ?? new Decimal(0)).toString(),
    refunds: new Decimal(refundAgg._sum.finalPrice ?? 0).toString(),
  };
}

export type DailyClosingPaymentsSection = { cash: string; card: string; bank: string; other: string };

async function buildPaymentsReceivedSection(start: Date, end: Date): Promise<DailyClosingPaymentsSection> {
  const grouped = await prisma.cashTransaction.groupBy({
    by: ["paymentMethod"],
    where: {
      direction: "IN",
      transactionType: { in: ["SALE_PAYMENT", "CUSTOMER_PAYMENT"] },
      createdAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });
  const byMethod = new Map(grouped.map((g) => [g.paymentMethod, new Decimal(g._sum.amount ?? 0)]));
  return {
    cash: (byMethod.get("CASH") ?? new Decimal(0)).toString(),
    card: (byMethod.get("CARD") ?? new Decimal(0)).toString(),
    bank: (byMethod.get("BANK_TRANSFER") ?? new Decimal(0)).toString(),
    other: (byMethod.get("OTHER") ?? new Decimal(0)).toString(),
  };
}

export type DailyClosingExpensesSection = { cashExpenses: string; bankExpenses: string; otherExpenses: string; totalExpenses: string };

async function buildExpensesSection(start: Date, end: Date): Promise<DailyClosingExpensesSection> {
  const grouped = await prisma.cashTransaction.groupBy({
    by: ["paymentMethod"],
    where: { direction: "OUT", transactionType: "EXPENSE", createdAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const byMethod = new Map(grouped.map((g) => [g.paymentMethod, new Decimal(g._sum.amount ?? 0)]));
  const cashExpenses = byMethod.get("CASH") ?? new Decimal(0);
  const bankExpenses = byMethod.get("BANK_TRANSFER") ?? new Decimal(0);
  const otherExpenses = [...byMethod.entries()]
    .filter(([method]) => method !== "CASH" && method !== "BANK_TRANSFER")
    .reduce((sum, [, amount]) => sum.add(amount), new Decimal(0));

  return {
    cashExpenses: cashExpenses.toString(),
    bankExpenses: bankExpenses.toString(),
    otherExpenses: otherExpenses.toString(),
    totalExpenses: cashExpenses.add(bankExpenses).add(otherExpenses).toString(),
  };
}

export type DailyClosingCashSection = {
  openingCash: string;
  cashReceived: string;
  cashPaid: string;
  cashAdjustments: string;
  expectedClosingCash: string;
};

/**
 * Opening + Received - Paid + Adjustments = Expected. `CASH_ADJUSTMENT`
 * transactions are broken out into their own bucket rather than folded into
 * Received/Paid — see DAILY-CLOSING.md "Cash formula".
 */
async function buildCashSection(start: Date, end: Date): Promise<DailyClosingCashSection> {
  const [openingCash, receivedAgg, paidAgg, adjInAgg, adjOutAgg] = await Promise.all([
    getCashBalanceAsOf(start),
    prisma.cashTransaction.aggregate({
      where: { direction: "IN", transactionType: { not: "CASH_ADJUSTMENT" }, createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: { direction: "OUT", transactionType: { not: "CASH_ADJUSTMENT" }, createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: { direction: "IN", transactionType: "CASH_ADJUSTMENT", createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: { direction: "OUT", transactionType: "CASH_ADJUSTMENT", createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ]);

  const cashReceived = new Decimal(receivedAgg._sum.amount ?? 0);
  const cashPaid = new Decimal(paidAgg._sum.amount ?? 0);
  const cashAdjustments = new Decimal(adjInAgg._sum.amount ?? 0).sub(new Decimal(adjOutAgg._sum.amount ?? 0));
  const expectedClosingCash = openingCash.add(cashReceived).sub(cashPaid).add(cashAdjustments);

  return {
    openingCash: openingCash.toString(),
    cashReceived: cashReceived.toString(),
    cashPaid: cashPaid.toString(),
    cashAdjustments: cashAdjustments.toString(),
    expectedClosingCash: expectedClosingCash.toString(),
  };
}

export type DailyClosingGoldRow = {
  purity: GoldPurity;
  goldSold: string;
  goldPurchased: string;
  goldReceived: string;
  goldGiven: string;
  goldReturned: string;
  goldAdjustments: string;
};

async function buildGoldSection(start: Date, end: Date): Promise<DailyClosingGoldRow[]> {
  const [soldByPurity, purchasedByPurity, ledgerRows] = await Promise.all([
    prisma.saleItem.groupBy({
      by: ["purity"],
      where: {
        sale: { saleDate: { gte: start, lte: end } },
        OR: [{ return: null }, { return: { status: { not: "RETURNED" } } }],
      },
      _sum: { grossWeight: true },
    }),
    prisma.purchaseItem.groupBy({
      by: ["purity"],
      where: { purchase: { purchaseDate: { gte: start, lte: end } } },
      _sum: { grossWeight: true },
    }),
    prisma.goldLedgerEntry.groupBy({
      by: ["purity", "transactionType"],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { debit: true, credit: true },
    }),
  ]);

  const sold = new Map(soldByPurity.map((r) => [r.purity, new Decimal(r._sum.grossWeight ?? 0)]));
  const purchased = new Map(purchasedByPurity.map((r) => [r.purity, new Decimal(r._sum.grossWeight ?? 0)]));

  const rowsByPurity = new Map<GoldPurity, DailyClosingGoldRow>();
  const ensure = (purity: GoldPurity): DailyClosingGoldRow => {
    let row = rowsByPurity.get(purity);
    if (!row) {
      row = {
        purity,
        goldSold: "0",
        goldPurchased: "0",
        goldReceived: "0",
        goldGiven: "0",
        goldReturned: "0",
        goldAdjustments: "0",
      };
      rowsByPurity.set(purity, row);
    }
    return row;
  };

  for (const purity of GOLD_PURITIES) {
    const soldWeight = sold.get(purity as GoldPurity) ?? new Decimal(0);
    const purchasedWeight = purchased.get(purity as GoldPurity) ?? new Decimal(0);
    if (soldWeight.gt(0) || purchasedWeight.gt(0)) {
      const row = ensure(purity as GoldPurity);
      row.goldSold = soldWeight.toString();
      row.goldPurchased = purchasedWeight.toString();
    }
  }

  for (const entry of ledgerRows) {
    const row = ensure(entry.purity);
    const debit = new Decimal(entry._sum.debit ?? 0);
    const credit = new Decimal(entry._sum.credit ?? 0);
    if (entry.transactionType === "GOLD_GIVEN") row.goldGiven = debit.toString();
    else if (entry.transactionType === "GOLD_RECEIVED") row.goldReceived = credit.toString();
    else if (entry.transactionType === "GOLD_RETURNED") row.goldReturned = debit.toString();
    else if (entry.transactionType === "GOLD_ADJUSTMENT") row.goldAdjustments = debit.sub(credit).toString();
  }

  return [...rowsByPurity.values()].sort((a, b) => a.purity.localeCompare(b.purity));
}

export type DailyClosingReceivablesSection = {
  openingReceivable: string;
  newCreditSales: string;
  paymentsReceived: string;
  closingReceivable: string;
};

async function buildReceivablesSection(start: Date, end: Date): Promise<DailyClosingReceivablesSection> {
  const [opening, closing, newCreditAgg, paymentsAgg] = await Promise.all([
    getHistoricalTotalReceivable(start),
    getHistoricalTotalReceivable(new Date(end.getTime() + 1)),
    prisma.customerLedgerEntry.aggregate({
      where: { transactionType: "SALE", createdAt: { gte: start, lte: end } },
      _sum: { debit: true },
    }),
    prisma.customerLedgerEntry.aggregate({
      where: { transactionType: "PAYMENT", createdAt: { gte: start, lte: end } },
      _sum: { credit: true },
    }),
  ]);

  return {
    openingReceivable: opening.toString(),
    newCreditSales: new Decimal(newCreditAgg._sum.debit ?? 0).toString(),
    paymentsReceived: new Decimal(paymentsAgg._sum.credit ?? 0).toString(),
    closingReceivable: closing.toString(),
  };
}

export type DailyClosingPayablesSection = {
  openingPayable: string;
  newPurchases: string;
  paymentsMade: string;
  closingPayable: string;
};

async function buildPayablesSection(start: Date, end: Date): Promise<DailyClosingPayablesSection> {
  const [opening, closing, newPurchasesAgg, paymentsAgg] = await Promise.all([
    getHistoricalTotalPartyPayable(start, "SUPPLIER"),
    getHistoricalTotalPartyPayable(new Date(end.getTime() + 1), "SUPPLIER"),
    prisma.partyCashLedgerEntry.aggregate({
      where: { partyType: "SUPPLIER", transactionType: "PURCHASE", createdAt: { gte: start, lte: end } },
      _sum: { debit: true },
    }),
    prisma.partyCashLedgerEntry.aggregate({
      where: { partyType: "SUPPLIER", transactionType: "PAYMENT", createdAt: { gte: start, lte: end } },
      _sum: { credit: true },
    }),
  ]);

  return {
    openingPayable: opening.toString(),
    newPurchases: new Decimal(newPurchasesAgg._sum.debit ?? 0).toString(),
    paymentsMade: new Decimal(paymentsAgg._sum.credit ?? 0).toString(),
    closingPayable: closing.toString(),
  };
}

export type UnresolvedClosingIssues = {
  pendingCashReconciliation: boolean;
  pendingGoldReconciliationPurities: GoldPurity[];
  failedTransactionsCount: number;
  unapprovedAdjustmentsCount: number;
  openReturnsCount: number;
  unpaidBalancesCount: number | null;
  hasIssues: boolean;
};

/**
 * "Failed transactions" and "unapproved adjustments" are always 0: this
 * codebase's transactional design means a failed operation never persists a
 * partial row (see ARCHITECTURE.md), and every adjustment function
 * (recordGoldAdjustment, recordPartyCashAdjustment, recordCashAdjustment)
 * writes immediately — there is no queued-for-approval state to check.
 * Documented here rather than silently omitted.
 */
export async function getUnresolvedClosingIssues(): Promise<UnresolvedClosingIssues> {
  const [latestCash, latestGoldByPurity, openReturnsCount, flagUnpaid] = await Promise.all([
    getLatestCashReconciliation(),
    getLatestGoldReconciliationByPurity(),
    prisma.return.count({ where: { status: "RETURN_REQUESTED" } }),
    getFlagUnpaidBalancesOnClosing(),
  ]);

  const pendingCashReconciliation = !latestCash || latestCash.status === "RECONCILIATION_REQUIRED";
  const pendingGoldReconciliationPurities = GOLD_PURITIES.filter((purity) => {
    const latest = latestGoldByPurity[purity];
    return !latest || latest.status === "RECONCILIATION_REQUIRED";
  }) as GoldPurity[];

  let unpaidBalancesCount: number | null = null;
  if (flagUnpaid) {
    const [customersOwing, partiesOwing] = await Promise.all([
      prisma.customer.count({ where: { outstandingBalance: { gt: 0 } } }),
      prisma.partyCashBalance.count({ where: { balance: { gt: 0 } } }),
    ]);
    unpaidBalancesCount = customersOwing + partiesOwing;
  }

  const hasIssues =
    pendingCashReconciliation ||
    pendingGoldReconciliationPurities.length > 0 ||
    openReturnsCount > 0 ||
    (unpaidBalancesCount ?? 0) > 0;

  return {
    pendingCashReconciliation,
    pendingGoldReconciliationPurities,
    failedTransactionsCount: 0,
    unapprovedAdjustmentsCount: 0,
    openReturnsCount,
    unpaidBalancesCount,
    hasIssues,
  };
}

export type DailyClosingFigures = {
  businessDate: string;
  sales: DailyClosingSalesSection;
  paymentsReceived: DailyClosingPaymentsSection;
  expenses: DailyClosingExpensesSection;
  cash: DailyClosingCashSection;
  gold: DailyClosingGoldRow[];
  receivables: DailyClosingReceivablesSection;
  payables: DailyClosingPayablesSection;
  issues: UnresolvedClosingIssues;
};

/** Read-only — live-computed figures for a business date, used both for the pre-submit preview and internally by submitDailyClosing. */
export async function computeDailyClosingFigures(businessDate: Date): Promise<DailyClosingFigures> {
  const { start, end } = dayBounds(businessDate);

  const [sales, paymentsReceived, expenses, cash, gold, receivables, payables, issues] = await Promise.all([
    buildSalesSection(start, end),
    buildPaymentsReceivedSection(start, end),
    buildExpensesSection(start, end),
    buildCashSection(start, end),
    buildGoldSection(start, end),
    buildReceivablesSection(start, end),
    buildPayablesSection(start, end),
    getUnresolvedClosingIssues(),
  ]);

  return {
    businessDate: businessDate.toISOString().slice(0, 10),
    sales,
    paymentsReceived,
    expenses,
    cash,
    gold,
    receivables,
    payables,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Closing workflow — OPEN (no row) -> PENDING_REVIEW / CLOSED -> REOPENED -> ...
// ---------------------------------------------------------------------------

export class InvalidPhysicalCashAmountError extends Error {
  constructor(message = "Physical cash amount cannot be negative.") {
    super(message);
    this.name = "InvalidPhysicalCashAmountError";
  }
}

export class DailyClosingAlreadyClosedError extends Error {
  constructor(message = "This business date is already closed. Reopen it first to resubmit.") {
    super(message);
    this.name = "DailyClosingAlreadyClosedError";
  }
}

export class DailyClosingNotFoundError extends Error {
  constructor(message = "No closing submission found for this business date.") {
    super(message);
    this.name = "DailyClosingNotFoundError";
  }
}

export class DailyClosingNotPendingReviewError extends Error {
  constructor(message = "This business date is not pending review.") {
    super(message);
    this.name = "DailyClosingNotPendingReviewError";
  }
}

export class DailyClosingNotClosedError extends Error {
  constructor(message = "This business date is not closed.") {
    super(message);
    this.name = "DailyClosingNotClosedError";
  }
}

export class EmptyReopenReasonError extends Error {
  constructor(message = "A reason is required to reopen a closed business day.") {
    super(message);
    this.name = "EmptyReopenReasonError";
  }
}

export type DailyClosingRecord = {
  id: string;
  businessDate: string;
  status: DailyClosingStatus;
  openingCash: string;
  cashReceived: string;
  cashPaid: string;
  cashAdjustments: string;
  expectedClosingCash: string;
  physicalCashAmount: string | null;
  cashDifference: string | null;
  notes: string | null;
  submittedAt: Date | null;
  closedAt: Date | null;
  reopenedAt: Date | null;
  reopenReason: string | null;
};

function toRecord(row: {
  id: string;
  businessDate: Date;
  status: DailyClosingStatus;
  openingCash: Prisma.Decimal;
  cashReceived: Prisma.Decimal;
  cashPaid: Prisma.Decimal;
  cashAdjustments: Prisma.Decimal;
  expectedClosingCash: Prisma.Decimal;
  physicalCashAmount: Prisma.Decimal | null;
  cashDifference: Prisma.Decimal | null;
  notes: string | null;
  submittedAt: Date | null;
  closedAt: Date | null;
  reopenedAt: Date | null;
  reopenReason: string | null;
}): DailyClosingRecord {
  return {
    id: row.id,
    businessDate: row.businessDate.toISOString().slice(0, 10),
    status: row.status,
    openingCash: row.openingCash.toString(),
    cashReceived: row.cashReceived.toString(),
    cashPaid: row.cashPaid.toString(),
    cashAdjustments: row.cashAdjustments.toString(),
    expectedClosingCash: row.expectedClosingCash.toString(),
    physicalCashAmount: row.physicalCashAmount?.toString() ?? null,
    cashDifference: row.cashDifference?.toString() ?? null,
    notes: row.notes,
    submittedAt: row.submittedAt,
    closedAt: row.closedAt,
    reopenedAt: row.reopenedAt,
    reopenReason: row.reopenReason,
  };
}

export async function getDailyClosingByDate(businessDate: Date): Promise<DailyClosingRecord | null> {
  const row = await prisma.dailyClosing.findUnique({ where: { businessDate } });
  return row ? toRecord(row) : null;
}

/**
 * Submits the day's physical cash count. If no unresolved issues exist, the
 * day closes immediately (status CLOSED). Otherwise it's saved as
 * PENDING_REVIEW, requiring a separate `confirmDailyClosing` call — see
 * DAILY-CLOSING.md "Workflow".
 */
export async function submitDailyClosing(
  input: { businessDate: Date; physicalCashAmount: number; notes?: string },
  userId: string,
): Promise<DailyClosingRecord> {
  if (input.physicalCashAmount < 0) throw new InvalidPhysicalCashAmountError();

  const existing = await prisma.dailyClosing.findUnique({ where: { businessDate: input.businessDate } });
  if (existing && existing.status === "CLOSED") throw new DailyClosingAlreadyClosedError();

  const figures = await computeDailyClosingFigures(input.businessDate);
  const expected = new Decimal(figures.cash.expectedClosingCash);
  const physical = new Decimal(input.physicalCashAmount);
  const difference = physical.sub(expected);
  const status: DailyClosingStatus = figures.issues.hasIssues ? "PENDING_REVIEW" : "CLOSED";
  const now = new Date();

  const row = await prisma.dailyClosing.upsert({
    where: { businessDate: input.businessDate },
    create: {
      businessDate: input.businessDate,
      status,
      openingCash: figures.cash.openingCash,
      cashReceived: figures.cash.cashReceived,
      cashPaid: figures.cash.cashPaid,
      cashAdjustments: figures.cash.cashAdjustments,
      expectedClosingCash: figures.cash.expectedClosingCash,
      physicalCashAmount: String(input.physicalCashAmount),
      cashDifference: difference.toString(),
      unresolvedIssues: figures.issues as unknown as Prisma.InputJsonValue,
      notes: input.notes || null,
      submittedById: userId,
      submittedAt: now,
      ...(status === "CLOSED" ? { closedById: userId, closedAt: now } : {}),
    },
    update: {
      status,
      openingCash: figures.cash.openingCash,
      cashReceived: figures.cash.cashReceived,
      cashPaid: figures.cash.cashPaid,
      cashAdjustments: figures.cash.cashAdjustments,
      expectedClosingCash: figures.cash.expectedClosingCash,
      physicalCashAmount: String(input.physicalCashAmount),
      cashDifference: difference.toString(),
      unresolvedIssues: figures.issues as unknown as Prisma.InputJsonValue,
      notes: input.notes || null,
      submittedById: userId,
      submittedAt: now,
      ...(status === "CLOSED" ? { closedById: userId, closedAt: now } : { closedById: null, closedAt: null }),
    },
  });

  await writeAuditLog({
    userId,
    action: "DAILY_CLOSING_SUBMITTED",
    entity: "DailyClosing",
    entityId: row.id,
    metadata: {
      businessDate: figures.businessDate,
      expectedClosingCash: figures.cash.expectedClosingCash,
      physicalCashAmount: String(input.physicalCashAmount),
      cashDifference: difference.toString(),
      hasIssues: figures.issues.hasIssues,
      status,
    },
  });

  if (status === "CLOSED") {
    await writeAuditLog({
      userId,
      action: "DAY_CLOSED",
      entity: "DailyClosing",
      entityId: row.id,
      metadata: { businessDate: figures.businessDate, cashDifference: difference.toString() },
    });
  }

  return toRecord(row);
}

/** Closes a PENDING_REVIEW day after a human has reviewed its unresolved issues. */
export async function confirmDailyClosing(businessDate: Date, userId: string): Promise<DailyClosingRecord> {
  const existing = await prisma.dailyClosing.findUnique({ where: { businessDate } });
  if (!existing) throw new DailyClosingNotFoundError();
  if (existing.status !== "PENDING_REVIEW") throw new DailyClosingNotPendingReviewError();

  const row = await prisma.dailyClosing.update({
    where: { businessDate },
    data: { status: "CLOSED", closedById: userId, closedAt: new Date() },
  });

  await writeAuditLog({
    userId,
    action: "DAY_CLOSED",
    entity: "DailyClosing",
    entityId: row.id,
    metadata: { businessDate: businessDate.toISOString().slice(0, 10), confirmedAfterReview: true },
  });

  return toRecord(row);
}

/** Only an authorized user (accounting:daily_closing_reopen) may reopen a closed day — always requires a reason. */
export async function reopenDailyClosing(
  input: { businessDate: Date; reason: string },
  userId: string,
): Promise<DailyClosingRecord> {
  if (!input.reason.trim()) throw new EmptyReopenReasonError();

  const existing = await prisma.dailyClosing.findUnique({ where: { businessDate: input.businessDate } });
  if (!existing) throw new DailyClosingNotFoundError();
  if (existing.status !== "CLOSED") throw new DailyClosingNotClosedError();

  const row = await prisma.dailyClosing.update({
    where: { businessDate: input.businessDate },
    data: {
      status: "REOPENED",
      reopenedById: userId,
      reopenedAt: new Date(),
      reopenReason: input.reason,
    },
  });

  await writeAuditLog({
    userId,
    action: "DAY_REOPENED",
    entity: "DailyClosing",
    entityId: row.id,
    metadata: { businessDate: input.businessDate.toISOString().slice(0, 10), reason: input.reason },
  });

  return toRecord(row);
}

export async function listRecentDailyClosings(limit = 30): Promise<DailyClosingRecord[]> {
  const rows = await prisma.dailyClosing.findMany({ orderBy: { businessDate: "desc" }, take: limit });
  return rows.map(toRecord);
}

export { getCurrentBusinessDate };
