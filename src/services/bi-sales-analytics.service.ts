import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { GoldPurity, PaymentMethod } from "@/generated/prisma/client";
import { getSalesReport, type SalesReport } from "@/services/financial-reports.service";
import { resolveReportDateRange, type ReportDatePreset } from "@/lib/report-date-range";
import { getBusinessTimezone } from "@/services/financial-settings.service";
import { computeGrowth, type GrowthComparison } from "@/services/bi-dashboard.service";

/**
 * Sales Analytics — see ANALYTICS.md "Sales analytics". Everything here
 * either wraps financial-reports.service.ts's getSalesReport() (period
 * totals) or aggregates server-side with a single grouped SQL query per
 * chart (never loads raw transactions into the browser).
 */

export type TrendGrouping = "day" | "week" | "month";

export type SalesTrendPoint = { period: string; sales: string; itemsSold: number };

export type SalesTrendFilters = {
  categoryId?: string;
  purity?: GoldPurity;
  cashierId?: string;
  customerId?: string;
  paymentMethod?: PaymentMethod;
  branchId?: string;
};

/** One grouped query — day/week/month bucketing done in Postgres via date_trunc, never client-side. */
export async function getSalesTrend(
  preset: ReportDatePreset,
  grouping: TrendGrouping,
  custom?: { from: Date; to: Date },
  filters: SalesTrendFilters = {},
): Promise<SalesTrendPoint[]> {
  const timezone = await getBusinessTimezone();
  const { from, to } = resolveReportDateRange(preset, timezone, custom);

  const rows = await prisma.$queryRaw<{ period: Date; sales: Prisma.Decimal; items: bigint }[]>`
    SELECT
      date_trunc(${grouping}, s."saleDate") AS period,
      COALESCE(SUM(si."finalPrice"), 0) AS sales,
      COUNT(si.id) AS items
    FROM sale_items si
    JOIN sales s ON s.id = si."saleId"
    LEFT JOIN inventory_items ii ON ii.id = si."inventoryItemId"
    LEFT JOIN products p ON p.id = ii."productId"
    LEFT JOIN returns r ON r."saleItemId" = si.id
    WHERE s."saleDate" >= ${from} AND s."saleDate" <= ${to}
      AND (r.id IS NULL OR r.status != 'RETURNED')
      AND (${filters.categoryId ?? null}::uuid IS NULL OR p."categoryId" = ${filters.categoryId ?? null}::uuid)
      AND (${filters.purity ?? null}::"GoldPurity" IS NULL OR si.purity = ${filters.purity ?? null}::"GoldPurity")
      AND (${filters.cashierId ?? null}::uuid IS NULL OR s."createdById" = ${filters.cashierId ?? null}::uuid)
      AND (${filters.customerId ?? null}::uuid IS NULL OR s."customerId" = ${filters.customerId ?? null}::uuid)
      AND (${filters.branchId ?? null}::uuid IS NULL OR s."branchId" = ${filters.branchId ?? null}::uuid)
      AND (
        ${filters.paymentMethod ?? null}::"PaymentMethod" IS NULL
        OR EXISTS (SELECT 1 FROM payments pay WHERE pay."saleId" = s.id AND pay.method = ${filters.paymentMethod ?? null}::"PaymentMethod")
      )
    GROUP BY period
    ORDER BY period ASC
  `;

  return rows.map((r) => ({
    period: r.period.toISOString().slice(0, 10),
    sales: new Decimal(r.sales).toString(),
    itemsSold: Number(r.items),
  }));
}

export type SalesPeriodComparison = {
  today: SalesReport;
  yesterday: SalesReport;
  thisMonth: SalesReport;
  lastMonth: SalesReport;
  dayOverDay: GrowthComparison;
  monthOverMonth: GrowthComparison;
};

/** The spec's "Sales Today/Yesterday/This Month/Last Month" block plus growth %, safe against a zero previous period. */
export async function getSalesPeriodComparison(): Promise<SalesPeriodComparison> {
  const [today, yesterday, thisMonth, lastMonth] = await Promise.all([
    getSalesReport("today", undefined),
    getSalesReport("yesterday", undefined),
    getSalesReport("this_month", undefined),
    getSalesReport("last_month", undefined),
  ]);

  return {
    today,
    yesterday,
    thisMonth,
    lastMonth,
    dayOverDay: computeGrowth(today.netSales, yesterday.netSales),
    monthOverMonth: computeGrowth(thisMonth.netSales, lastMonth.netSales),
  };
}
