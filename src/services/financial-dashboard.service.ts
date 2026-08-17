import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { getProfitAndLoss } from "@/services/profit-loss.service";
import { getCashBalance } from "@/services/cash-transaction.service";
import { listGoldWithKarigars } from "@/services/gold-ledger.service";
import { getBusinessTimezone } from "@/services/financial-settings.service";
import { resolveBusinessDateInTimezone } from "@/lib/business-date";
import { Prisma } from "@/generated/prisma/client";
import type { GoldPurity } from "@/generated/prisma/client";

/**
 * Aggregates for the Financial Dashboard's top cards and charts — every
 * number is a real, live query; nothing here is placeholder/demo data. See
 * ACCOUNTING.md "Financial dashboard".
 */

export type FinancialDashboardSummary = {
  todaySales: string;
  todayGrossProfit: string;
  todayExpenses: string;
  todayNetProfit: string;
  cashBalance: string;
  customerReceivables: string;
  supplierPayables: string;
  goldWithKarigars: { purity: GoldPurity; weight: string }[];
};

export async function getFinancialDashboardSummary(): Promise<FinancialDashboardSummary> {
  const [todayPL, cashBalance, receivablesAgg, payablesAgg, karigarGold] = await Promise.all([
    getProfitAndLoss("today"),
    getCashBalance(),
    prisma.customer.aggregate({ _sum: { outstandingBalance: true } }),
    prisma.partyCashBalance.aggregate({ where: { partyType: "SUPPLIER", balance: { gt: 0 } }, _sum: { balance: true } }),
    listGoldWithKarigars(),
  ]);

  const goldWithKarigars = new Map<GoldPurity, Decimal>();
  for (const karigar of karigarGold) {
    for (const position of karigar.positions) {
      if (position.status !== "HOLDS_GOLD") continue;
      const existing = goldWithKarigars.get(position.purity) ?? new Decimal(0);
      goldWithKarigars.set(position.purity, existing.add(position.balance));
    }
  }

  return {
    todaySales: todayPL.netSales,
    todayGrossProfit: todayPL.grossProfit,
    todayExpenses: todayPL.operatingExpenses,
    todayNetProfit: todayPL.netProfit,
    cashBalance,
    customerReceivables: new Decimal(receivablesAgg._sum.outstandingBalance ?? 0).toString(),
    supplierPayables: new Decimal(payablesAgg._sum.balance ?? 0).toString(),
    goldWithKarigars: [...goldWithKarigars.entries()].map(([purity, weight]) => ({ purity, weight: weight.toString() })),
  };
}

export type DailyTrendPoint = { date: string; sales: string; grossProfit: string };

/** Last `days` calendar days (business timezone), oldest first — one efficient grouped query, not N+1. */
export async function getDailyTrend(days = 14): Promise<DailyTrendPoint[]> {
  const timezone = await getBusinessTimezone();
  const today = resolveBusinessDateInTimezone(new Date(), timezone);
  const start = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<{ day: Date; sales: Prisma.Decimal; cogs: Prisma.Decimal }[]>`
    SELECT
      date_trunc('day', s."saleDate") AS day,
      COALESCE(SUM(si."finalPrice"), 0) AS sales,
      COALESCE(SUM(si."goldValue" + si."makingCharge" + si."stoneCharge" + si."diamondCharge" + si."otherCharge"), 0) AS cogs
    FROM sale_items si
    JOIN sales s ON s.id = si."saleId"
    LEFT JOIN returns r ON r."saleItemId" = si.id
    WHERE s."saleDate" >= ${start}
      AND (r.id IS NULL OR r.status != 'RETURNED')
    GROUP BY day
    ORDER BY day ASC
  `;

  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r]));
  const points: DailyTrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    const row = byDay.get(key);
    const sales = new Decimal(row?.sales ?? 0);
    const cogs = new Decimal(row?.cogs ?? 0);
    points.push({ date: key, sales: sales.toString(), grossProfit: sales.sub(cogs).toString() });
  }
  return points;
}

export type SalesByCategoryRow = { categoryId: string; categoryName: string; total: string };

export async function getSalesByCategoryThisMonth(): Promise<SalesByCategoryRow[]> {
  const timezone = await getBusinessTimezone();
  const today = resolveBusinessDateInTimezone(new Date(), timezone);
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const items = await prisma.saleItem.findMany({
    where: {
      sale: { saleDate: { gte: start } },
      OR: [{ return: null }, { return: { status: { not: "RETURNED" } } }],
    },
    select: { finalPrice: true, inventoryItem: { select: { product: { select: { category: { select: { id: true, name: true } } } } } } },
  });

  const map = new Map<string, SalesByCategoryRow>();
  for (const item of items) {
    const category = item.inventoryItem.product.category;
    const existing = map.get(category.id);
    if (existing) {
      existing.total = new Decimal(existing.total).add(item.finalPrice.toString()).toString();
    } else {
      map.set(category.id, { categoryId: category.id, categoryName: category.name, total: item.finalPrice.toString() });
    }
  }

  return [...map.values()].sort((a, b) => Number(b.total) - Number(a.total));
}
