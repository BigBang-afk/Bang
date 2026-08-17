"use server";

import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { writeAuditLog } from "@/services/audit.service";
import { toCsv } from "@/lib/csv";
import {
  reportDateRangeSchema,
  salesReportFilterSchema,
  purchaseReportFilterSchema,
} from "@/lib/validation/accounting";
import { getSalesReport, getPurchaseReport, getExpenseReport, getCashReport, getGoldReport, getReceivableAgingReport, getPayableReport, getInventoryValuationReport } from "@/services/financial-reports.service";
import { runFullFinancialReconciliation, type FullFinancialReconciliation } from "@/services/financial-reconciliation.service";
import { formatWeight } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

async function requireExportAccess() {
  return requirePermissionAction(PERMISSIONS.ACCOUNTING_EXPORT);
}

async function logExport(userId: string, reportName: string) {
  await writeAuditLog({ userId, action: "REPORT_EXPORTED", entity: "FinancialReport", metadata: { report: reportName } });
}

function toRange(parsed: { preset: string; from?: Date; to?: Date }) {
  return { preset: parsed.preset as Parameters<typeof getSalesReport>[0], custom: parsed.from && parsed.to ? { from: parsed.from, to: parsed.to } : undefined };
}

export async function exportSalesReportAction(input: unknown): Promise<ActionResult<string>> {
  let user;
  try {
    user = await requireExportAccess();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = salesReportFilterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid report filters." };

  const { preset, custom } = toRange(parsed.data);
  const report = await getSalesReport(preset, custom, {
    cashierId: parsed.data.cashierId,
    customerId: parsed.data.customerId,
    categoryId: parsed.data.categoryId,
    paymentMethod: parsed.data.paymentMethod,
  });

  const csv = toCsv(
    ["Metric", "Value"],
    [
      ["From", report.from],
      ["To", report.to],
      ["Gross Sales", report.grossSales],
      ["Discounts", report.discounts],
      ["Net Sales", report.netSales],
      ["Invoices", report.invoiceCount],
      ["Items Sold", report.itemsSold],
      ["Average Invoice Value", report.averageInvoiceValue],
      ["Cash Sales", report.cashSales],
      ["Card Sales", report.cardSales],
      ["Bank Sales", report.bankSales],
      ["Credit Sales", report.creditSales],
      ["Refunds", report.refunds],
      ...report.goldSoldByPurity.map((g) => [`Gold Sold (${PURITY_LABELS[g.purity]})`, g.weight]),
    ],
  );

  await logExport(user.id, "sales_report");
  return { ok: true, data: csv };
}

export async function exportPurchaseReportAction(input: unknown): Promise<ActionResult<string>> {
  let user;
  try {
    user = await requireExportAccess();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = purchaseReportFilterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid report filters." };

  const { preset, custom } = toRange(parsed.data);
  const report = await getPurchaseReport(preset, custom, {
    supplierId: parsed.data.supplierId,
    categoryId: parsed.data.categoryId,
    purity: parsed.data.purity,
    paymentStatus: parsed.data.paymentStatus,
  });

  const csv = toCsv(
    ["Metric", "Value"],
    [
      ["From", report.from],
      ["To", report.to],
      ["Purchases", report.purchaseCount],
      ["Total Purchase Cost", report.totalPurchaseCost],
      ["Amount Paid", report.amountPaid],
      ["Outstanding Payable", report.outstandingPayable],
      ["Items Purchased", report.itemsPurchased],
      ...report.goldPurchasedByPurity.map((g) => [`Gold Purchased (${PURITY_LABELS[g.purity]})`, g.weight]),
    ],
  );

  await logExport(user.id, "purchase_report");
  return { ok: true, data: csv };
}

export async function exportExpenseReportAction(input: unknown): Promise<ActionResult<string>> {
  let user;
  try {
    user = await requireExportAccess();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = reportDateRangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid report filters." };

  const { preset, custom } = toRange(parsed.data);
  const report = await getExpenseReport(preset, custom);

  const csv = toCsv(
    ["Category", "Total", "Count"],
    report.byCategory.map((c) => [c.categoryName, c.total, c.count]),
  );

  await logExport(user.id, "expense_report");
  return { ok: true, data: csv };
}

export async function exportCashReportAction(input: unknown): Promise<ActionResult<string>> {
  let user;
  try {
    user = await requireExportAccess();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = reportDateRangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid report filters." };

  const { preset, custom } = toRange(parsed.data);
  const report = await getCashReport(preset, custom);

  const csv = toCsv(
    ["Metric", "Value"],
    [
      ["From", report.from],
      ["To", report.to],
      ["Opening Cash", report.openingCash],
      ["Cash In", report.cashIn],
      ["Cash Out", report.cashOut],
      ["Expected Closing", report.expectedClosing],
      ["Physical Closing", report.physicalClosing ?? "Not recorded"],
      ["Difference", report.difference ?? "N/A"],
      ...report.byType.map((t) => [`${t.transactionType} (${t.direction})`, t.total]),
    ],
  );

  await logExport(user.id, "cash_report");
  return { ok: true, data: csv };
}

export async function exportGoldReportAction(input: unknown): Promise<ActionResult<string>> {
  let user;
  try {
    user = await requireExportAccess();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = reportDateRangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid report filters." };

  const { preset, custom } = toRange(parsed.data);
  const report = await getGoldReport(preset, custom);

  const csv = toCsv(
    ["Purity", "Opening", "Purchased", "Received", "Given", "Sold", "Returned", "Adjustments", "Closing"],
    report.rows.map((r) => [
      PURITY_LABELS[r.purity],
      formatWeight(r.openingGold),
      formatWeight(r.goldPurchased),
      formatWeight(r.goldReceived),
      formatWeight(r.goldGiven),
      formatWeight(r.goldSold),
      formatWeight(r.goldReturned),
      formatWeight(r.goldAdjustments),
      formatWeight(r.closingGold),
    ]),
  );

  await logExport(user.id, "gold_report");
  return { ok: true, data: csv };
}

export async function exportReceivableAgingAction(): Promise<ActionResult<string>> {
  let user;
  try {
    user = await requireExportAccess();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const report = await getReceivableAgingReport();
  const csv = toCsv(
    ["Customer Code", "Name", "Outstanding Balance", "Age (days)", "Bucket", "Last Payment"],
    report.rows.map((r) => [
      r.customerCode,
      r.name,
      r.outstandingBalance,
      r.ageDays,
      r.bucket,
      r.lastPaymentAt ? r.lastPaymentAt.toISOString().slice(0, 10) : "Never",
    ]),
  );

  await logExport(user.id, "receivable_aging_report");
  return { ok: true, data: csv };
}

export async function exportPayableReportAction(): Promise<ActionResult<string>> {
  let user;
  try {
    user = await requireExportAccess();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const rows = await getPayableReport();
  const csv = toCsv(
    ["Party Type", "Code", "Name", "Payable", "Age (days)"],
    rows.map((r) => [r.partyType, r.partyCode, r.name, r.payable, r.ageDays]),
  );

  await logExport(user.id, "payable_report");
  return { ok: true, data: csv };
}

export async function exportInventoryValuationAction(): Promise<ActionResult<string>> {
  let user;
  try {
    user = await requireExportAccess();
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const report = await getInventoryValuationReport();
  const csv = toCsv(
    ["Category", "Items", "Cost Value", "Selling Value"],
    report.byCategory.map((c) => [c.label, c.itemCount, c.costValue, c.sellingValue]),
  );

  await logExport(user.id, "inventory_valuation_report");
  return { ok: true, data: csv };
}

export async function runFinancialReconciliationAction(): Promise<ActionResult<FullFinancialReconciliation>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.ACCOUNTING_RECONCILE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const result = await runFullFinancialReconciliation(user.id);
  return { ok: true, data: result };
}
