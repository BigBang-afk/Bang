import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { resolveReportDateRange, type ReportDatePreset } from "@/lib/report-date-range";
import { getBusinessTimezone } from "@/services/financial-settings.service";
import type { TrendGrouping } from "@/services/bi-sales-analytics.service";

/**
 * Profit Analytics — see ANALYTICS.md "Profit analytics". COGS is always
 * each sold item's own recorded cost snapshot (the same fields
 * profit-loss.service.ts's getProfitAndLoss() sums), never recalculated
 * from today's gold rate. Cancelled/voided sales and returned items are
 * always excluded server-side.
 */

const COGS_EXPR = Prisma.sql`(si."goldValue" + si."makingCharge" + si."stoneCharge" + si."diamondCharge" + si."otherCharge")`;

function marginPercent(profit: Decimal, revenue: Decimal): string {
  if (revenue.isZero()) return "0";
  return profit.div(revenue).mul(100).toDecimalPlaces(2).toString();
}

export type ProfitTrendPoint = {
  period: string;
  revenue: string;
  cogs: string;
  grossProfit: string;
  expenses: string;
  netProfit: string;
};

export async function getProfitTrend(
  preset: ReportDatePreset,
  grouping: TrendGrouping,
  custom?: { from: Date; to: Date },
): Promise<ProfitTrendPoint[]> {
  const timezone = await getBusinessTimezone();
  const { from, to } = resolveReportDateRange(preset, timezone, custom);

  const [salesRows, expenseRows] = await Promise.all([
    prisma.$queryRaw<{ period: Date; revenue: Prisma.Decimal; cogs: Prisma.Decimal }[]>`
      SELECT
        date_trunc(${grouping}, s."saleDate") AS period,
        COALESCE(SUM(si."finalPrice"), 0) AS revenue,
        COALESCE(SUM(${COGS_EXPR}), 0) AS cogs
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      LEFT JOIN returns r ON r."saleItemId" = si.id
      WHERE s."saleDate" >= ${from} AND s."saleDate" <= ${to}
        AND (r.id IS NULL OR r.status != 'RETURNED')
      GROUP BY period
      ORDER BY period ASC
    `,
    prisma.$queryRaw<{ period: Date; total: Prisma.Decimal }[]>`
      SELECT date_trunc(${grouping}, "expenseDate") AS period, COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE "expenseDate" >= ${from} AND "expenseDate" <= ${to} AND status = 'ACTIVE'
      GROUP BY period
      ORDER BY period ASC
    `,
  ]);

  const expenseByPeriod = new Map(expenseRows.map((r) => [r.period.toISOString().slice(0, 10), new Decimal(r.total)]));

  return salesRows.map((row) => {
    const key = row.period.toISOString().slice(0, 10);
    const revenue = new Decimal(row.revenue);
    const cogs = new Decimal(row.cogs);
    const grossProfit = revenue.sub(cogs);
    const expenses = expenseByPeriod.get(key) ?? new Decimal(0);
    return {
      period: key,
      revenue: revenue.toString(),
      cogs: cogs.toString(),
      grossProfit: grossProfit.toString(),
      expenses: expenses.toString(),
      netProfit: grossProfit.sub(expenses).toString(),
    };
  });
}

export type ProfitByCategoryRow = {
  categoryId: string;
  categoryName: string;
  revenue: string;
  cogs: string;
  grossProfit: string;
  marginPercent: string;
};

/** Groups by the real, configurable ProductCategory table — never a hardcoded category list. */
export async function getProfitByCategory(preset: ReportDatePreset, custom?: { from: Date; to: Date }): Promise<ProfitByCategoryRow[]> {
  const timezone = await getBusinessTimezone();
  const { from, to } = resolveReportDateRange(preset, timezone, custom);

  const rows = await prisma.$queryRaw<{ categoryId: string; categoryName: string; revenue: Prisma.Decimal; cogs: Prisma.Decimal }[]>`
    SELECT
      c.id AS "categoryId",
      c.name AS "categoryName",
      COALESCE(SUM(si."finalPrice"), 0) AS revenue,
      COALESCE(SUM(${COGS_EXPR}), 0) AS cogs
    FROM sale_items si
    JOIN sales s ON s.id = si."saleId"
    JOIN inventory_items ii ON ii.id = si."inventoryItemId"
    JOIN products p ON p.id = ii."productId"
    JOIN product_categories c ON c.id = p."categoryId"
    LEFT JOIN returns r ON r."saleItemId" = si.id
    WHERE s."saleDate" >= ${from} AND s."saleDate" <= ${to}
      AND (r.id IS NULL OR r.status != 'RETURNED')
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
  `;

  return rows.map((r) => {
    const revenue = new Decimal(r.revenue);
    const cogs = new Decimal(r.cogs);
    const grossProfit = revenue.sub(cogs);
    return {
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      revenue: revenue.toString(),
      cogs: cogs.toString(),
      grossProfit: grossProfit.toString(),
      marginPercent: marginPercent(grossProfit, revenue),
    };
  });
}

export type TopProductRow = {
  productName: string;
  unitsSold: number;
  revenue: string;
  cogs: string;
  grossProfit: string;
  marginPercent: string;
};

export type TopProductMetric = "units" | "revenue" | "profit";

/** Best-selling / highest-revenue / highest-profit products — completed sales only, returns excluded. Grouped by the sold item's recorded product name (SaleItem.productName), not the live InventoryItem, so a since-archived product still shows correctly in a past period. */
export async function getTopProducts(
  preset: ReportDatePreset,
  metric: TopProductMetric,
  custom?: { from: Date; to: Date },
  limit = 10,
): Promise<TopProductRow[]> {
  const timezone = await getBusinessTimezone();
  const { from, to } = resolveReportDateRange(preset, timezone, custom);

  const rows = await prisma.$queryRaw<{ productName: string; units: bigint; revenue: Prisma.Decimal; cogs: Prisma.Decimal }[]>`
    SELECT
      si."productName" AS "productName",
      COUNT(si.id) AS units,
      COALESCE(SUM(si."finalPrice"), 0) AS revenue,
      COALESCE(SUM(${COGS_EXPR}), 0) AS cogs
    FROM sale_items si
    JOIN sales s ON s.id = si."saleId"
    LEFT JOIN returns r ON r."saleItemId" = si.id
    WHERE s."saleDate" >= ${from} AND s."saleDate" <= ${to}
      AND (r.id IS NULL OR r.status != 'RETURNED')
    GROUP BY si."productName"
  `;

  const mapped = rows.map((r) => {
    const revenue = new Decimal(r.revenue);
    const cogs = new Decimal(r.cogs);
    const grossProfit = revenue.sub(cogs);
    return {
      productName: r.productName,
      unitsSold: Number(r.units),
      revenue: revenue.toString(),
      cogs: cogs.toString(),
      grossProfit: grossProfit.toString(),
      marginPercent: marginPercent(grossProfit, revenue),
    };
  });

  const sortKey = metric === "units" ? (r: TopProductRow) => r.unitsSold : metric === "revenue" ? (r: TopProductRow) => Number(r.revenue) : (r: TopProductRow) => Number(r.grossProfit);
  return mapped.sort((a, b) => sortKey(b) - sortKey(a)).slice(0, limit);
}
