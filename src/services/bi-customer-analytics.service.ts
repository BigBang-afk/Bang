import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { getCustomerDashboardSummary, type CustomerDashboardSummary } from "@/services/customer-analytics.service";

/**
 * Customer Analytics (BI rollup) — see ANALYTICS.md "Customer analytics".
 * Headline counts reuse Phase 4's getCustomerDashboardSummary() rather
 * than re-deriving them; retention/LTV/cohorts are new, purely-additive
 * views computed from real completed-sale data. No causal claims are made
 * anywhere here — a cohort's later purchases are reported as a fact, not
 * attributed to any specific cause.
 */

export type CustomerAnalyticsSummary = CustomerDashboardSummary & {
  repeatCustomers: number;
  /** (customers with 2+ completed purchases) / (customers with at least 1 completed purchase) × 100 — see ANALYTICS.md "Repeat purchase rate" for this exact definition. Null when no customer has ever purchased (division would be meaningless). */
  repeatPurchaseRatePercent: string | null;
};

export async function getCustomerAnalyticsSummary(): Promise<CustomerAnalyticsSummary> {
  const [base, purchaseCounts] = await Promise.all([
    getCustomerDashboardSummary(),
    prisma.sale.groupBy({ by: ["customerId"], where: { customerId: { not: null }, status: { not: "RETURNED" } }, _count: true }),
  ]);

  const customersWithAtLeastOnePurchase = purchaseCounts.length;
  const repeatCustomers = purchaseCounts.filter((row) => row._count >= 2).length;
  const repeatPurchaseRatePercent =
    customersWithAtLeastOnePurchase === 0
      ? null
      : new Decimal(repeatCustomers).div(customersWithAtLeastOnePurchase).mul(100).toDecimalPlaces(1).toString();

  return { ...base, repeatCustomers, repeatPurchaseRatePercent };
}

export type TopCustomerRow = {
  customerId: string;
  name: string;
  totalSpending: string;
  purchaseCount: number;
  averagePurchaseValue: string;
};

export type TopCustomerMetric = "spending" | "frequency";

export async function getTopCustomers(metric: TopCustomerMetric, limit = 20): Promise<TopCustomerRow[]> {
  const rows = await prisma.sale.groupBy({
    by: ["customerId"],
    where: { customerId: { not: null }, status: { not: "RETURNED" } },
    _sum: { grandTotal: true },
    _count: true,
    orderBy: metric === "spending" ? { _sum: { grandTotal: "desc" } } : { _count: { customerId: "desc" } },
    take: limit,
  });

  const customers = await prisma.customer.findMany({
    where: { id: { in: rows.map((r) => r.customerId as string) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(customers.map((c) => [c.id, c.name]));

  return rows.map((row) => {
    const totalSpending = new Decimal(row._sum.grandTotal ?? 0);
    return {
      customerId: row.customerId as string,
      name: nameById.get(row.customerId as string) ?? "Unknown",
      totalSpending: totalSpending.toString(),
      purchaseCount: row._count,
      averagePurchaseValue: row._count > 0 ? totalSpending.div(row._count).toDecimalPlaces(2).toString() : "0",
    };
  });
}

export type AverageLifetimeValue = { averageLifetimeValue: string; customersConsidered: number };

/** Average total spending across every customer with at least one completed purchase — completed sales only, returns already excluded from grandTotal at the point a return is processed. */
export async function getAverageCustomerLifetimeValue(): Promise<AverageLifetimeValue> {
  const rows = await prisma.sale.groupBy({
    by: ["customerId"],
    where: { customerId: { not: null }, status: { not: "RETURNED" } },
    _sum: { grandTotal: true },
  });
  if (rows.length === 0) return { averageLifetimeValue: "0", customersConsidered: 0 };

  const total = rows.reduce((sum, r) => sum.add(r._sum.grandTotal ?? 0), new Decimal(0));
  return { averageLifetimeValue: total.div(rows.length).toDecimalPlaces(2).toString(), customersConsidered: rows.length };
}

export type CohortRow = {
  cohortMonth: string;
  cohortSize: number;
  /** retention[i] = customers from this cohort who also purchased in cohort-month + i, as a percentage of cohortSize. Index 0 is always 100 (the cohort-defining purchase). */
  retentionPercent: (string | null)[];
};

/**
 * Basic first-purchase-month cohort retention — see ANALYTICS.md "Customer
 * cohorts". Reports a plain fact (did this cohort's customers buy again in
 * a later month), never a causal claim about why. `monthsForward` caps how
 * many subsequent months are reported per cohort.
 */
export async function getCustomerCohorts(monthsForward = 6, maxCohorts = 12): Promise<CohortRow[]> {
  const purchases = await prisma.sale.findMany({
    where: { customerId: { not: null }, status: { not: "RETURNED" } },
    select: { customerId: true, saleDate: true },
  });
  if (purchases.length === 0) return [];

  const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthIndex = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();

  const monthsByCustomer = new Map<string, Set<number>>();
  const firstMonthByCustomer = new Map<string, number>();
  for (const p of purchases) {
    const customerId = p.customerId as string;
    const idx = monthIndex(p.saleDate);
    if (!monthsByCustomer.has(customerId)) monthsByCustomer.set(customerId, new Set());
    monthsByCustomer.get(customerId)!.add(idx);
    const first = firstMonthByCustomer.get(customerId);
    if (first === undefined || idx < first) firstMonthByCustomer.set(customerId, idx);
  }

  const cohorts = new Map<number, string[]>();
  for (const [customerId, firstIdx] of firstMonthByCustomer) {
    if (!cohorts.has(firstIdx)) cohorts.set(firstIdx, []);
    cohorts.get(firstIdx)!.push(customerId);
  }

  const sortedCohortMonths = [...cohorts.keys()].sort((a, b) => b - a).slice(0, maxCohorts).sort((a, b) => a - b);

  return sortedCohortMonths.map((cohortIdx) => {
    const customerIds = cohorts.get(cohortIdx)!;
    const cohortSize = customerIds.length;
    const retentionPercent: (string | null)[] = [];
    for (let offset = 0; offset <= monthsForward; offset++) {
      const targetMonth = cohortIdx + offset;
      const returning = customerIds.filter((id) => monthsByCustomer.get(id)?.has(targetMonth)).length;
      retentionPercent.push(cohortSize === 0 ? null : new Decimal(returning).div(cohortSize).mul(100).toDecimalPlaces(1).toString());
    }
    const cohortDate = new Date(Date.UTC(Math.floor(cohortIdx / 12), cohortIdx % 12, 1));
    return { cohortMonth: monthKey(cohortDate), cohortSize, retentionPercent };
  });
}
