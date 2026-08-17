import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { getBusinessTimezone } from "@/services/financial-settings.service";
import { resolveReportDateRange, type ReportDatePreset } from "@/lib/report-date-range";

/**
 * Profit & Loss — see PROFIT-LOSS.md for the full methodology, worked
 * examples, and the returns/discount policy. COGS is always the SOLD
 * item's own recorded cost snapshot (SaleItem's copied goldValue +
 * makingCharge + stoneCharge + diamondCharge + otherCharge — the exact
 * components InventoryItem.totalCost was built from at sale time), never
 * recalculated from today's gold rate. See ARCHITECTURE.md "Precision &
 * money handling" and INVENTORY.md for why that snapshot exists.
 */

export type ProfitLossReport = {
  from: string;
  to: string;
  label: string;
  grossSales: string;
  discounts: string;
  netSales: string;
  cogs: string;
  grossProfit: string;
  grossMarginPercent: string;
  otherIncome: string;
  operatingExpenses: string;
  netProfit: string;
  netMarginPercent: string;
  itemsSold: number;
  refundedItemsExcluded: number;
};

function marginPercent(numerator: Decimal, revenue: Decimal): string {
  if (revenue.isZero()) return "0";
  return numerator.div(revenue).mul(100).toDecimalPlaces(2).toString();
}

/**
 * A SaleItem is included in revenue/COGS for the sale's date range UNLESS
 * it has since been returned (Return.status = RETURNED), regardless of
 * when the return was processed — a returned item is treated as though it
 * never sold, which correctly reverses BOTH revenue and COGS together
 * (never just subtracting refund cash from profit). See PROFIT-LOSS.md
 * "Returns policy" for why this means re-running a past period's report
 * can show a different number after a later return — a documented,
 * deliberate choice, not a bug.
 */
async function getSalesAggregate(from: Date, to: Date) {
  const [agg, refundedCount] = await Promise.all([
    prisma.saleItem.aggregate({
      where: {
        sale: { saleDate: { gte: from, lte: to } },
        OR: [{ return: null }, { return: { status: { not: "RETURNED" } } }],
      },
      _sum: {
        originalSellingPrice: true,
        discountAmount: true,
        finalPrice: true,
        goldValue: true,
        makingCharge: true,
        stoneCharge: true,
        diamondCharge: true,
        otherCharge: true,
      },
      _count: true,
    }),
    prisma.saleItem.count({
      where: { sale: { saleDate: { gte: from, lte: to } }, return: { status: "RETURNED" } },
    }),
  ]);

  return { agg, refundedCount };
}

async function getOtherIncomeTotal(from: Date, to: Date): Promise<Decimal> {
  const agg = await prisma.income.aggregate({
    where: { status: "ACTIVE", incomeDate: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  return new Decimal(agg._sum.amount ?? 0);
}

async function getOperatingExpensesTotal(from: Date, to: Date): Promise<Decimal> {
  const agg = await prisma.expense.aggregate({
    where: { status: "ACTIVE", expenseDate: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  return new Decimal(agg._sum.amount ?? 0);
}

export async function getProfitAndLoss(
  preset: ReportDatePreset,
  custom?: { from: Date; to: Date },
): Promise<ProfitLossReport> {
  const timezone = await getBusinessTimezone();
  const { from, to, label } = resolveReportDateRange(preset, timezone, custom);

  const [{ agg, refundedCount }, otherIncome, operatingExpenses] = await Promise.all([
    getSalesAggregate(from, to),
    getOtherIncomeTotal(from, to),
    getOperatingExpensesTotal(from, to),
  ]);

  const grossSales = new Decimal(agg._sum.originalSellingPrice ?? 0);
  const discounts = new Decimal(agg._sum.discountAmount ?? 0);
  const netSales = new Decimal(agg._sum.finalPrice ?? 0);
  const cogs = new Decimal(agg._sum.goldValue ?? 0)
    .add(new Decimal(agg._sum.makingCharge ?? 0))
    .add(new Decimal(agg._sum.stoneCharge ?? 0))
    .add(new Decimal(agg._sum.diamondCharge ?? 0))
    .add(new Decimal(agg._sum.otherCharge ?? 0));
  const grossProfit = netSales.sub(cogs);
  const netProfit = grossProfit.add(otherIncome).sub(operatingExpenses);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    label,
    grossSales: grossSales.toString(),
    discounts: discounts.toString(),
    netSales: netSales.toString(),
    cogs: cogs.toString(),
    grossProfit: grossProfit.toString(),
    grossMarginPercent: marginPercent(grossProfit, netSales),
    otherIncome: otherIncome.toString(),
    operatingExpenses: operatingExpenses.toString(),
    netProfit: netProfit.toString(),
    netMarginPercent: marginPercent(netProfit, netSales),
    itemsSold: agg._count,
    refundedItemsExcluded: refundedCount,
  };
}
