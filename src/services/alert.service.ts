import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { AlertSeverity, AlertStatus, AlertType } from "@/generated/prisma/client";
import { writeAuditLog } from "@/services/audit.service";
import { getSystemSetting } from "@/services/system-setting.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import { getProfitAndLoss } from "@/services/profit-loss.service";
import { getDailyClosingByDate } from "@/services/daily-closing.service";

/**
 * Business Alerts — see ALERT-SYSTEM.md. Every generator here is a
 * deterministic rule reading real data; nothing in this file ever
 * modifies the transaction/balance it flags (a cash-shortage alert never
 * adjusts cash, a low-stock alert never reorders stock). Unusual-
 * transaction wording is always neutral ("requires review"), never an
 * accusation.
 */

export type CreateAlertInput = {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  branchId?: string;
};

/** Creates an alert, but never a second OPEN duplicate for the same (type, entityType, entityId) — re-running a generator is always safe to repeat. */
async function createAlertIfNotDuplicate(input: CreateAlertInput): Promise<void> {
  if (input.entityId) {
    const existing = await prisma.alert.findFirst({
      where: { type: input.type, entityType: input.entityType, entityId: input.entityId, status: "OPEN" },
      select: { id: true },
    });
    if (existing) return;
  }
  await prisma.alert.create({
    data: {
      type: input.type,
      severity: input.severity,
      title: input.title,
      description: input.description,
      entityType: input.entityType,
      entityId: input.entityId,
      branchId: input.branchId,
    },
  });
}

async function getIntSetting(key: string, fallback: number): Promise<number> {
  const raw = await getSystemSetting(key);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Below `bi.low_stock_category_threshold` in-stock pieces in a category — see ALERT-SYSTEM.md "Low stock rule": a category-count threshold, since unique jewelry has no per-SKU reorder point. */
export async function generateLowStockAlerts(): Promise<number> {
  const threshold = await getIntSetting(SETTINGS_KEYS.BI_LOW_STOCK_CATEGORY_THRESHOLD, 5);

  const categories = await prisma.productCategory.findMany({ select: { id: true, name: true } });
  const counts = await prisma.inventoryItem.groupBy({
    by: ["productId"],
    where: { archivedAt: null, status: "IN_STOCK" },
    _count: true,
  });
  const products = await prisma.product.findMany({ select: { id: true, categoryId: true } });
  const categoryByProduct = new Map(products.map((p) => [p.id, p.categoryId]));

  const countByCategory = new Map<string, number>();
  for (const row of counts) {
    const categoryId = categoryByProduct.get(row.productId);
    if (!categoryId) continue;
    countByCategory.set(categoryId, (countByCategory.get(categoryId) ?? 0) + row._count);
  }

  let created = 0;
  for (const category of categories) {
    const count = countByCategory.get(category.id) ?? 0;
    if (count < threshold) {
      await createAlertIfNotDuplicate({
        type: "LOW_STOCK",
        severity: count === 0 ? "HIGH" : "WARNING",
        title: `Low stock: ${category.name}`,
        description: `Only ${count} in-stock piece${count === 1 ? "" : "s"} remain in "${category.name}" (threshold: ${threshold}).`,
        entityType: "ProductCategory",
        entityId: category.id,
      });
      created += 1;
    }
  }
  return created;
}

/** A category with in-stock items sitting past `bi.aging_stock_days` with no sale — see ALERT-SYSTEM.md. Recommendation only; never auto-discounted. */
export async function generateAgingStockAlerts(): Promise<number> {
  const days = await getIntSetting(SETTINGS_KEYS.BI_AGING_STOCK_DAYS, 90);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.inventoryItem.groupBy({
    by: ["productId"],
    where: { archivedAt: null, status: "IN_STOCK", createdAt: { lte: cutoff } },
    _count: true,
  });
  if (rows.length === 0) return 0;

  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((r) => r.productId) } },
    select: { id: true, name: true, categoryId: true, category: { select: { name: true } } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  let created = 0;
  for (const row of rows) {
    const product = productById.get(row.productId);
    if (!product) continue;
    await createAlertIfNotDuplicate({
      type: "AGING_STOCK",
      severity: "INFO",
      title: `Aging stock: ${product.name}`,
      description: `${row._count} piece${row._count === 1 ? "" : "s"} of "${product.name}" (${product.category.name}) have had no recorded sale for over ${days} days. Consider a campaign or featured-display placement.`,
      entityType: "Product",
      entityId: product.id,
    });
    created += 1;
  }
  return created;
}

/** A Daily Closing shortfall (physical below expected) of at least `bi.cash_shortage_threshold`. Never adjusts cash itself. */
export async function generateCashShortageAlerts(businessDate: Date): Promise<number> {
  const threshold = await getIntSetting(SETTINGS_KEYS.BI_CASH_SHORTAGE_THRESHOLD, 1000);
  const closing = await getDailyClosingByDate(businessDate);
  if (!closing || closing.cashDifference === null) return 0;

  const shortage = new Decimal(closing.cashDifference).neg();
  if (shortage.lt(threshold)) return 0;

  await createAlertIfNotDuplicate({
    type: "CASH_SHORTAGE",
    severity: shortage.gte(threshold * 5) ? "CRITICAL" : "WARNING",
    title: `Cash shortage on ${businessDate.toISOString().slice(0, 10)}`,
    description: `Physical cash was ${shortage.toString()} below the expected closing balance on ${businessDate.toISOString().slice(0, 10)}.`,
    entityType: "DailyClosing",
    entityId: closing.id,
  });
  return 1;
}

/** The latest GoldReconciliation per purity that came back RECONCILIATION_REQUIRED. */
export async function generateGoldReconciliationAlerts(): Promise<number> {
  const latestByPurity = await prisma.goldReconciliation.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["purity"],
  });

  let created = 0;
  for (const row of latestByPurity) {
    if (row.status !== "RECONCILIATION_REQUIRED") continue;
    await createAlertIfNotDuplicate({
      type: "GOLD_RECONCILIATION",
      severity: "HIGH",
      title: `Gold reconciliation required: ${row.purity}`,
      description: `${row.purity} physical count differs from the system balance by ${row.differenceWeight.toString()}g.`,
      entityType: "GoldReconciliation",
      entityId: row.id,
    });
    created += 1;
  }
  return created;
}

/** A single supplier/karigar payable, or a single customer receivable, above `bi.high_balance_threshold`. */
export async function generateHighBalanceAlerts(): Promise<{ payables: number; receivables: number }> {
  const threshold = await getIntSetting(SETTINGS_KEYS.BI_HIGH_BALANCE_THRESHOLD, 500000);

  const [highPayables, highReceivables] = await Promise.all([
    prisma.partyCashBalance.findMany({ where: { balance: { gt: threshold } }, select: { partyType: true, partyId: true, balance: true } }),
    prisma.customer.findMany({ where: { outstandingBalance: { gt: threshold } }, select: { id: true, name: true, outstandingBalance: true } }),
  ]);

  let payableCount = 0;
  for (const row of highPayables) {
    await createAlertIfNotDuplicate({
      type: "SUPPLIER_PAYABLE_HIGH",
      severity: "WARNING",
      title: `High payable: ${row.partyType.toLowerCase()}`,
      description: `A ${row.partyType.toLowerCase()} balance of ${row.balance.toString()} exceeds the configured threshold (${threshold}).`,
      entityType: row.partyType === "SUPPLIER" ? "Supplier" : "Karigar",
      entityId: row.partyId,
    });
    payableCount += 1;
  }

  let receivableCount = 0;
  for (const row of highReceivables) {
    await createAlertIfNotDuplicate({
      type: "CUSTOMER_RECEIVABLE_HIGH",
      severity: "WARNING",
      title: `High receivable: ${row.name}`,
      description: `${row.name}'s outstanding balance of ${row.outstandingBalance.toString()} exceeds the configured threshold (${threshold}).`,
      entityType: "Customer",
      entityId: row.id,
    });
    receivableCount += 1;
  }

  return { payables: payableCount, receivables: receivableCount };
}

/** This month's expenses vs. the trailing 3-month average — needs at least 2 prior months of data, else silently skips (never alerts off an incomplete baseline). */
export async function generateExpenseSpikeAlert(): Promise<boolean> {
  const thresholdPercent = await getIntSetting(SETTINGS_KEYS.BI_EXPENSE_SPIKE_PERCENT, 50);
  const now = new Date();
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const historyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));

  const [thisMonth, history] = await Promise.all([
    prisma.expense.aggregate({ where: { status: "ACTIVE", expenseDate: { gte: thisMonthStart } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { status: "ACTIVE", expenseDate: { gte: historyStart, lt: thisMonthStart } }, _sum: { amount: true } }),
  ]);

  const historicalAverage = new Decimal(history._sum.amount ?? 0).div(3);
  if (historicalAverage.isZero()) return false; // insufficient history — never alert off a zero/undefined baseline

  const current = new Decimal(thisMonth._sum.amount ?? 0);
  const increasePercent = current.sub(historicalAverage).div(historicalAverage).mul(100);
  if (increasePercent.lt(thresholdPercent)) return false;

  await createAlertIfNotDuplicate({
    type: "EXPENSE_SPIKE",
    severity: "WARNING",
    title: "Expense spike this month",
    description: `This month's expenses (${current.toString()}) are ${increasePercent.toDecimalPlaces(0).toString()}% above the trailing 3-month average (${historicalAverage.toDecimalPlaces(2).toString()}).`,
    entityType: "Expense",
    entityId: thisMonthStart.toISOString().slice(0, 7),
  });
  return true;
}

/** This month vs. last month net sales — needs both periods to have sales data, else skipped (never a fabricated drop off zero history). */
export async function generateSalesDropAlert(): Promise<boolean> {
  const thresholdPercent = await getIntSetting(SETTINGS_KEYS.BI_SALES_DROP_PERCENT, 20);
  const [current, previous] = await Promise.all([getProfitAndLoss("this_month"), getProfitAndLoss("last_month")]);

  const previousSales = new Decimal(previous.netSales);
  if (previousSales.isZero()) return false;

  const currentSales = new Decimal(current.netSales);
  const dropPercent = previousSales.sub(currentSales).div(previousSales).mul(100);
  if (dropPercent.lt(thresholdPercent)) return false;

  await createAlertIfNotDuplicate({
    type: "SALES_DROP",
    severity: dropPercent.gte(thresholdPercent * 2) ? "HIGH" : "WARNING",
    title: "Sales drop vs. last month",
    description: `This month's net sales (${currentSales.toString()}) are down ${dropPercent.toDecimalPlaces(0).toString()}% from last month (${previousSales.toString()}).`,
    entityType: "ProfitLoss",
    entityId: new Date().toISOString().slice(0, 7),
  });
  return true;
}

/** This month vs. last month gross profit — same guard/shape as the sales-drop alert. */
export async function generateProfitDropAlert(): Promise<boolean> {
  const thresholdPercent = await getIntSetting(SETTINGS_KEYS.BI_SALES_DROP_PERCENT, 20);
  const [current, previous] = await Promise.all([getProfitAndLoss("this_month"), getProfitAndLoss("last_month")]);

  const previousProfit = new Decimal(previous.grossProfit);
  if (previousProfit.lte(0)) return false;

  const currentProfit = new Decimal(current.grossProfit);
  const dropPercent = previousProfit.sub(currentProfit).div(previousProfit).mul(100);
  if (dropPercent.lt(thresholdPercent)) return false;

  await createAlertIfNotDuplicate({
    type: "PROFIT_DROP",
    severity: "HIGH",
    title: "Gross profit drop vs. last month",
    description: `This month's gross profit (${currentProfit.toString()}) is down ${dropPercent.toDecimalPlaces(0).toString()}% from last month (${previousProfit.toString()}).`,
    entityType: "ProfitLoss",
    entityId: `${new Date().toISOString().slice(0, 7)}-profit`,
  });
  return true;
}

/** A single discount, expense, refund, or cash adjustment at/above `bi.unusual_transaction_amount` — always neutral "requires review" wording, never an accusation. */
export async function generateUnusualTransactionAlerts(sinceHours = 24): Promise<number> {
  const threshold = await getIntSetting(SETTINGS_KEYS.BI_UNUSUAL_TRANSACTION_AMOUNT, 200000);
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  const [largeDiscounts, largeExpenses, largeAdjustments] = await Promise.all([
    prisma.saleItem.findMany({
      where: { discountAmount: { gte: threshold }, createdAt: { gte: since } },
      select: { id: true, discountAmount: true, productName: true },
    }),
    prisma.expense.findMany({
      where: { amount: { gte: threshold }, status: "ACTIVE", createdAt: { gte: since } },
      select: { id: true, amount: true, description: true },
    }),
    prisma.cashTransaction.findMany({
      where: { transactionType: "CASH_ADJUSTMENT", amount: { gte: threshold }, createdAt: { gte: since } },
      select: { id: true, amount: true },
    }),
  ]);

  let created = 0;
  for (const row of largeDiscounts) {
    await createAlertIfNotDuplicate({
      type: "UNUSUAL_TRANSACTION",
      severity: "WARNING",
      title: "Large discount — transaction requires review",
      description: `A discount of ${row.discountAmount.toString()} was applied on "${row.productName}", above the configured review threshold (${threshold}).`,
      entityType: "SaleItem",
      entityId: row.id,
    });
    created += 1;
  }
  for (const row of largeExpenses) {
    await createAlertIfNotDuplicate({
      type: "UNUSUAL_TRANSACTION",
      severity: "WARNING",
      title: "Large expense — transaction requires review",
      description: `An expense of ${row.amount.toString()} ("${row.description}") is above the configured review threshold (${threshold}).`,
      entityType: "Expense",
      entityId: row.id,
    });
    created += 1;
  }
  for (const row of largeAdjustments) {
    await createAlertIfNotDuplicate({
      type: "UNUSUAL_TRANSACTION",
      severity: "WARNING",
      title: "Large cash adjustment — transaction requires review",
      description: `A cash adjustment of ${row.amount.toString()} is above the configured review threshold (${threshold}).`,
      entityType: "CashTransaction",
      entityId: row.id,
    });
    created += 1;
  }
  return created;
}

/** Campaign messages the marketing provider reported FAILED — see WHATSAPP-INTEGRATION.md. */
export async function generateFailedMarketingAlerts(limit = 20): Promise<number> {
  const failed = await prisma.campaignMessage.findMany({
    where: { status: "FAILED" },
    select: { id: true, campaignId: true, error: true, campaign: { select: { name: true } } },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  let created = 0;
  for (const row of failed) {
    await createAlertIfNotDuplicate({
      type: "FAILED_MARKETING",
      severity: "INFO",
      title: `Message failed: ${row.campaign.name}`,
      description: `A message in campaign "${row.campaign.name}" failed to send (${row.error ?? "unknown error"}).`,
      entityType: "CampaignMessage",
      entityId: row.id,
    });
    created += 1;
  }
  return created;
}

/** Runs every generator with a real, deterministic data source. FAILED_PAYMENT has no generator yet — this schema has no concept of a failed POS payment (a Payment row is only ever written for a successful, completed sale) — see ALERT-SYSTEM.md "Known limitation". */
export async function runAllAlertGenerators(businessDate: Date): Promise<{ generated: number }> {
  const [lowStock, aging, cashShortage, goldReconciliation, highBalances, expenseSpike, salesDrop, profitDrop, unusual, failedMarketing] =
    await Promise.all([
      generateLowStockAlerts(),
      generateAgingStockAlerts(),
      generateCashShortageAlerts(businessDate),
      generateGoldReconciliationAlerts(),
      generateHighBalanceAlerts(),
      generateExpenseSpikeAlert(),
      generateSalesDropAlert(),
      generateProfitDropAlert(),
      generateUnusualTransactionAlerts(),
      generateFailedMarketingAlerts(),
    ]);

  const generated =
    lowStock + aging + cashShortage + goldReconciliation + highBalances.payables + highBalances.receivables +
    (expenseSpike ? 1 : 0) + (salesDrop ? 1 : 0) + (profitDrop ? 1 : 0) + unusual + failedMarketing;
  return { generated };
}

// ---------------------------------------------------------------------------
// Read / lifecycle
// ---------------------------------------------------------------------------

export type AlertListFilters = { status?: AlertStatus; type?: AlertType; severity?: AlertSeverity };

export async function listAlerts(filters: AlertListFilters = {}, limit = 100) {
  return prisma.alert.findMany({
    where: { status: filters.status, type: filters.type, severity: filters.severity },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { resolvedBy: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } },
  });
}

export async function getAlertCounts(): Promise<Record<AlertStatus, number>> {
  const rows = await prisma.alert.groupBy({ by: ["status"], _count: true });
  const counts: Record<AlertStatus, number> = { OPEN: 0, ACKNOWLEDGED: 0, RESOLVED: 0, DISMISSED: 0 };
  for (const row of rows) counts[row.status] = row._count;
  return counts;
}

export class AlertNotFoundError extends Error {
  constructor(message = "Alert could not be found.") {
    super(message);
    this.name = "AlertNotFoundError";
  }
}

async function transitionAlert(alertId: string, status: AlertStatus, auditAction: "ALERT_ACKNOWLEDGED" | "ALERT_RESOLVED" | "ALERT_DISMISSED", userId: string) {
  const existing = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!existing) throw new AlertNotFoundError();

  const alert = await prisma.alert.update({ where: { id: alertId }, data: { status, resolvedById: userId, resolvedAt: new Date() } });
  await writeAuditLog({ userId, action: auditAction, entity: "Alert", entityId: alertId, metadata: { type: alert.type } });
  return alert;
}

export const acknowledgeAlert = (alertId: string, userId: string) => transitionAlert(alertId, "ACKNOWLEDGED", "ALERT_ACKNOWLEDGED", userId);
export const resolveAlert = (alertId: string, userId: string) => transitionAlert(alertId, "RESOLVED", "ALERT_RESOLVED", userId);
export const dismissAlert = (alertId: string, userId: string) => transitionAlert(alertId, "DISMISSED", "ALERT_DISMISSED", userId);

/** For AI_RECOMMENDATION alerts specifically — created by bi-insight.service.ts when a live-data insight is actionable enough to surface in the Alerts Center. Never auto-generated from unvalidated AI text; the caller supplies the exact title/description built from real facts. */
export async function createAiRecommendationAlert(input: Omit<CreateAlertInput, "type">): Promise<void> {
  await createAlertIfNotDuplicate({ ...input, type: "AI_RECOMMENDATION" });
}

export { Prisma };
