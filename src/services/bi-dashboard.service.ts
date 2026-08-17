import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getProfitAndLoss } from "@/services/profit-loss.service";
import { getCashBalance } from "@/services/cash-transaction.service";
import { listGoldWithKarigars } from "@/services/gold-ledger.service";
import { getInventoryValuationReport } from "@/services/financial-reports.service";

/**
 * The Executive Dashboard's top KPI cards — see EXECUTIVE-DASHBOARD.md.
 * Every figure is a live composition of an existing Phase 1-6 service call
 * (getProfitAndLoss, getCashBalance, listGoldWithKarigars,
 * getInventoryValuationReport) — this file introduces no new source of
 * truth for money or gold.
 */

export type ExecutiveKpis = {
  todaySales: string;
  todayGrossProfit: string;
  todayNetProfit: string;
  monthlySales: string;
  monthlyGrossProfit: string;
  monthlyNetProfit: string;
  cashBalance: string;
  customerReceivables: string;
  supplierPayables: string;
  goldWithKarigars: { purity: string; weight: string }[];
  inventoryCostValue: string;
  inventorySellingValue: string;
};

export async function getExecutiveKpis(): Promise<ExecutiveKpis> {
  const [today, month, cashBalance, receivables, payables, goldWithKarigars, inventoryValuation] = await Promise.all([
    getProfitAndLoss("today"),
    getProfitAndLoss("this_month"),
    getCashBalance(),
    prisma.customer.aggregate({ _sum: { outstandingBalance: true } }),
    prisma.partyCashBalance.aggregate({ where: { partyType: "SUPPLIER", balance: { gt: 0 } }, _sum: { balance: true } }),
    listGoldWithKarigars(),
    getInventoryValuationReport(),
  ]);

  const goldTotals = new Map<string, Prisma.Decimal>();
  for (const party of goldWithKarigars) {
    for (const position of party.positions) {
      if (position.status !== "HOLDS_GOLD") continue;
      goldTotals.set(position.purity, (goldTotals.get(position.purity) ?? new Prisma.Decimal(0)).add(position.balance));
    }
  }

  return {
    todaySales: today.netSales,
    todayGrossProfit: today.grossProfit,
    todayNetProfit: today.netProfit,
    monthlySales: month.netSales,
    monthlyGrossProfit: month.grossProfit,
    monthlyNetProfit: month.netProfit,
    cashBalance,
    customerReceivables: (receivables._sum.outstandingBalance ?? new Prisma.Decimal(0)).toString(),
    supplierPayables: (payables._sum.balance ?? new Prisma.Decimal(0)).toString(),
    goldWithKarigars: [...goldTotals.entries()].map(([purity, weight]) => ({ purity, weight: weight.toString() })),
    inventoryCostValue: inventoryValuation.costValue,
    inventorySellingValue: inventoryValuation.sellingValue,
  };
}

export type GrowthComparison = {
  current: string;
  previous: string;
  /** null when the previous period had zero (or no) sales — a percentage would be meaningless/infinite, so callers must show "NO COMPARISON" rather than a misleading number. */
  growthPercent: string | null;
  direction: "UP" | "DOWN" | "FLAT" | "NO_COMPARISON";
};

/** (current - previous) / previous × 100 — returns NO_COMPARISON (never a fabricated percentage) when previous is zero. */
export function computeGrowth(current: string, previous: string): GrowthComparison {
  const currentDecimal = new Prisma.Decimal(current);
  const previousDecimal = new Prisma.Decimal(previous);

  if (previousDecimal.isZero()) {
    return { current, previous, growthPercent: null, direction: "NO_COMPARISON" };
  }

  const growthPercent = currentDecimal.sub(previousDecimal).div(previousDecimal).mul(100).toDecimalPlaces(1).toString();
  const direction = currentDecimal.gt(previousDecimal) ? "UP" : currentDecimal.lt(previousDecimal) ? "DOWN" : "FLAT";
  return { current, previous, growthPercent, direction };
}

export type SalesPerformance = {
  today: string;
  yesterday: string;
  thisMonth: string;
  lastMonth: string;
  dayOverDay: GrowthComparison;
  monthOverMonth: GrowthComparison;
};

export async function getSalesPerformance(): Promise<SalesPerformance> {
  const [today, yesterday, thisMonth, lastMonth] = await Promise.all([
    getProfitAndLoss("today"),
    getProfitAndLoss("yesterday"),
    getProfitAndLoss("this_month"),
    getProfitAndLoss("last_month"),
  ]);

  return {
    today: today.netSales,
    yesterday: yesterday.netSales,
    thisMonth: thisMonth.netSales,
    lastMonth: lastMonth.netSales,
    dayOverDay: computeGrowth(today.netSales, yesterday.netSales),
    monthOverMonth: computeGrowth(thisMonth.netSales, lastMonth.netSales),
  };
}
