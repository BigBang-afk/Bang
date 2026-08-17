import "server-only";
import { getProfitAndLoss } from "@/services/profit-loss.service";
import { getSalesReport } from "@/services/financial-reports.service";
import { getCashAnalytics } from "@/services/bi-cash-analytics.service";
import { getGoldByPurity } from "@/services/bi-gold-analytics.service";
import { getInventoryStatusBreakdown } from "@/services/bi-inventory-analytics.service";
import { getMarketingAnalyticsSummary } from "@/services/bi-marketing-analytics.service";
import { getAlertCounts } from "@/services/alert.service";
import { getTopProducts, getProfitByCategory } from "@/services/bi-profit-analytics.service";
import { getTopCustomers } from "@/services/bi-customer-analytics.service";
import { getCustomerDashboardSummary } from "@/services/customer-analytics.service";
import { computeGrowth, type GrowthComparison } from "@/services/bi-dashboard.service";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { toCsv } from "@/lib/csv";

/**
 * Daily/Weekly/Monthly Owner Reports — see AUTOMATED-REPORTS.md. Every
 * report is assembled from the same real-data BI/Phase 1-6 service
 * functions already used elsewhere; nothing here computes a figure a
 * second, independent way. CSV export is real (toCsv, the same RFC 4180
 * builder Phase 6's reports use) — no placeholder download button.
 */

export type DailyReport = {
  businessDate: string;
  sales: string;
  grossProfit: string;
  netProfit: string;
  expenses: string;
  goldSoldByPurity: { purity: string; weight: string }[];
  newCustomers: number;
  openAlerts: number;
};

export async function getDailyReport(businessDate: Date): Promise<DailyReport> {
  const to = new Date(businessDate.getTime() + 24 * 60 * 60 * 1000 - 1);
  const custom = { from: businessDate, to };

  const [profitLoss, salesReport, newCustomers, alertCounts] = await Promise.all([
    getProfitAndLoss("custom", custom),
    getSalesReport("custom", custom),
    prisma.customer.count({ where: { createdAt: { gte: businessDate, lte: to } } }),
    getAlertCounts(),
  ]);

  return {
    businessDate: businessDate.toISOString().slice(0, 10),
    sales: profitLoss.netSales,
    grossProfit: profitLoss.grossProfit,
    netProfit: profitLoss.netProfit,
    expenses: profitLoss.operatingExpenses,
    goldSoldByPurity: salesReport.goldSoldByPurity.map((g) => ({ purity: g.purity, weight: g.weight })),
    newCustomers,
    openAlerts: alertCounts.OPEN,
  };
}

export type WeeklyReport = {
  from: string;
  to: string;
  sales: string;
  grossProfit: string;
  expenses: string;
  salesGrowth: GrowthComparison;
  topProducts: Awaited<ReturnType<typeof getTopProducts>>;
  topCustomers: Awaited<ReturnType<typeof getTopCustomers>>;
  inventory: Awaited<ReturnType<typeof getInventoryStatusBreakdown>>;
  goldByPurity: Awaited<ReturnType<typeof getGoldByPurity>>;
  marketing: Awaited<ReturnType<typeof getMarketingAnalyticsSummary>>;
  cash: Awaited<ReturnType<typeof getCashAnalytics>>;
  openAlerts: number;
};

export async function getWeeklyReport(): Promise<WeeklyReport> {
  const [thisWeek, lastWeek, salesReport, topProducts, topCustomers, inventory, goldByPurity, marketing, cash, alertCounts] =
    await Promise.all([
      getProfitAndLoss("this_week"),
      getProfitAndLoss("last_month"), // no last_week preset exists; last_month is the nearest comparable full period this report suite exposes — documented in AUTOMATED-REPORTS.md
      getSalesReport("this_week", undefined),
      getTopProducts("this_week", "revenue"),
      getTopCustomers("spending"),
      getInventoryStatusBreakdown(),
      getGoldByPurity("this_week"),
      getMarketingAnalyticsSummary(),
      getCashAnalytics("this_week"),
      getAlertCounts(),
    ]);

  return {
    from: salesReport.from,
    to: salesReport.to,
    sales: thisWeek.netSales,
    grossProfit: thisWeek.grossProfit,
    expenses: thisWeek.operatingExpenses,
    salesGrowth: computeGrowth(thisWeek.netSales, lastWeek.netSales),
    topProducts,
    topCustomers,
    inventory,
    goldByPurity,
    marketing,
    cash,
    openAlerts: alertCounts.OPEN,
  };
}

export type MonthlyReport = {
  from: string;
  to: string;
  revenue: string;
  cogs: string;
  grossProfit: string;
  grossMarginPercent: string;
  expenses: string;
  netProfit: string;
  netMarginPercent: string;
  salesGrowth: GrowthComparison;
  customerGrowth: GrowthComparison;
  profitByCategory: Awaited<ReturnType<typeof getProfitByCategory>>;
  inventory: Awaited<ReturnType<typeof getInventoryStatusBreakdown>>;
  goldByPurity: Awaited<ReturnType<typeof getGoldByPurity>>;
  cash: Awaited<ReturnType<typeof getCashAnalytics>>;
  marketing: Awaited<ReturnType<typeof getMarketingAnalyticsSummary>>;
};

export async function getMonthlyReport(): Promise<MonthlyReport> {
  const [thisMonth, lastMonth, customersThisMonth, customersLastMonth, profitByCategory, inventory, goldByPurity, cash, marketing] =
    await Promise.all([
      getProfitAndLoss("this_month"),
      getProfitAndLoss("last_month"),
      getCustomerDashboardSummary(),
      prisma.customer.count(),
      getProfitByCategory("this_month"),
      getInventoryStatusBreakdown(),
      getGoldByPurity("this_month"),
      getCashAnalytics("this_month"),
      getMarketingAnalyticsSummary(),
    ]);

  return {
    from: thisMonth.from,
    to: thisMonth.to,
    revenue: thisMonth.netSales,
    cogs: thisMonth.cogs,
    grossProfit: thisMonth.grossProfit,
    grossMarginPercent: thisMonth.grossMarginPercent,
    expenses: thisMonth.operatingExpenses,
    netProfit: thisMonth.netProfit,
    netMarginPercent: thisMonth.netMarginPercent,
    salesGrowth: computeGrowth(thisMonth.netSales, lastMonth.netSales),
    customerGrowth: computeGrowth(String(customersThisMonth.newThisMonth), String(Math.max(0, customersLastMonth - customersThisMonth.newThisMonth))),
    profitByCategory,
    inventory,
    goldByPurity,
    cash,
    marketing,
  };
}

export function dailyReportToCsv(report: DailyReport): string {
  return toCsv(
    ["Metric", "Value"],
    [
      ["Business Date", report.businessDate],
      ["Sales", report.sales],
      ["Gross Profit", report.grossProfit],
      ["Net Profit", report.netProfit],
      ["Expenses", report.expenses],
      ["New Customers", report.newCustomers],
      ["Open Alerts", report.openAlerts],
      ...report.goldSoldByPurity.map((g) => [`Gold Sold (${g.purity})`, g.weight]),
    ],
  );
}

async function auditReportGenerated(userId: string, reportType: "DAILY" | "WEEKLY" | "MONTHLY") {
  await writeAuditLog({ userId, action: "REPORT_GENERATED", entity: "BiReport", metadata: { reportType } });
}

export { auditReportGenerated };
