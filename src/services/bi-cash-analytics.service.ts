import "server-only";
import Decimal from "decimal.js";
import { getCashReport, type CashReport } from "@/services/financial-reports.service";
import { resolveReportDateRange, type ReportDatePreset } from "@/lib/report-date-range";
import { getBusinessTimezone } from "@/services/financial-settings.service";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/dal";
import { resolveAuthorizedBranchIds, branchWhereClause } from "@/services/branch-access.service";

/**
 * Cash Analytics — see ANALYTICS.md "Cash analytics". The period totals
 * reuse financial-reports.service.ts's getCashReport(); this file adds the
 * spec's specific 6-bucket breakdown (Sales / Customer Payments /
 * Supplier Payments / Karigar Payments / Expenses / Other) on top of that
 * report's raw by-transaction-type grouping.
 */

export type CashBreakdown = {
  sales: string;
  customerPayments: string;
  supplierPayments: string;
  karigarPayments: string;
  expenses: string;
  other: string;
};

const BUCKET_BY_TYPE: Record<string, keyof CashBreakdown> = {
  SALE_PAYMENT: "sales",
  CUSTOMER_PAYMENT: "customerPayments",
  PURCHASE_PAYMENT: "supplierPayments",
  SUPPLIER_PAYMENT: "supplierPayments",
  KARIGAR_PAYMENT: "karigarPayments",
  KARIGAR_RECEIPT: "karigarPayments",
  EXPENSE: "expenses",
};

export type CashAnalytics = CashReport & { breakdown: CashBreakdown };

export async function getCashAnalytics(preset: ReportDatePreset, custom?: { from: Date; to: Date }): Promise<CashAnalytics> {
  const report = await getCashReport(preset, custom);

  const breakdown: CashBreakdown = {
    sales: "0",
    customerPayments: "0",
    supplierPayments: "0",
    karigarPayments: "0",
    expenses: "0",
    other: "0",
  };
  for (const row of report.byType) {
    const bucket = BUCKET_BY_TYPE[row.transactionType] ?? "other";
    breakdown[bucket] = new Decimal(breakdown[bucket]).add(row.total).toString();
  }

  return { ...report, breakdown };
}

export type BranchCashTotal = { branchId: string | null; totalIn: string; totalOut: string };

/**
 * Branch-scoped cash totals for the requested period — the CRITICAL
 * branch-isolation surface: a caller only ever sees totals for branches
 * `resolveAuthorizedBranchIds()` actually authorizes them for. Passing an
 * unauthorized `branchId` throws BranchAccessDeniedError (see
 * branch-access.service.ts) rather than silently returning company-wide
 * data.
 */
export async function getBranchCashTotals(
  user: Pick<CurrentUser, "id" | "role">,
  preset: ReportDatePreset,
  branchId?: string,
  custom?: { from: Date; to: Date },
): Promise<BranchCashTotal[]> {
  const timezone = await getBusinessTimezone();
  const { from, to } = resolveReportDateRange(preset, timezone, custom);
  const authorized = await resolveAuthorizedBranchIds(user);
  const branchFilter = branchWhereClause(authorized, branchId);

  if (authorized !== "ALL" && authorized.length === 0 && !branchId) return [];

  const rows = await prisma.cashTransaction.groupBy({
    by: ["branchId", "direction"],
    where: { createdAt: { gte: from, lte: to }, ...branchFilter },
    _sum: { amount: true },
  });

  const byBranch = new Map<string | null, BranchCashTotal>();
  for (const row of rows) {
    const key = row.branchId;
    const existing = byBranch.get(key) ?? { branchId: key, totalIn: "0", totalOut: "0" };
    const amount = (row._sum.amount ?? new Prisma.Decimal(0)).toString();
    if (row.direction === "IN") existing.totalIn = new Decimal(existing.totalIn).add(amount).toString();
    else existing.totalOut = new Decimal(existing.totalOut).add(amount).toString();
    byBranch.set(key, existing);
  }
  return [...byBranch.values()];
}
