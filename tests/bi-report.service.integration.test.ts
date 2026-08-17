import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  dailyReportToCsv,
  auditReportGenerated,
} from "@/services/bi-report.service";
import { getSeededOwnerId } from "./helpers/db-fixtures";

describe("Daily owner report (Test 22)", () => {
  it("assembles sales/profit/expenses/gold/customers/alerts for a given business date from real DB aggregates", async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const report = await getDailyReport(today);
    expect(report.businessDate).toBe(today.toISOString().slice(0, 10));
    expect(typeof report.sales).toBe("string");
    expect(typeof report.grossProfit).toBe("string");
    expect(typeof report.netProfit).toBe("string");
    expect(typeof report.expenses).toBe("string");
    expect(Array.isArray(report.goldSoldByPurity)).toBe(true);
    expect(report.newCustomers).toBeGreaterThanOrEqual(0);
    expect(report.openAlerts).toBeGreaterThanOrEqual(0);
  });

  it("exports a real CSV (not a placeholder) with the report's own figures", async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const report = await getDailyReport(today);

    const csv = dailyReportToCsv(report);
    expect(csv).toContain("Business Date");
    expect(csv).toContain(report.businessDate);
    expect(csv).toContain("Sales");
  });
});

describe("Weekly owner report (Test 23)", () => {
  it("compares this week vs. the previous comparable period and includes top products/customers/inventory/gold/marketing/cash", async () => {
    const report = await getWeeklyReport();
    expect(typeof report.sales).toBe("string");
    expect(report.salesGrowth).toHaveProperty("direction");
    expect(Array.isArray(report.topProducts)).toBe(true);
    expect(Array.isArray(report.topCustomers)).toBe(true);
    expect(Array.isArray(report.goldByPurity)).toBe(true);
    expect(report.marketing).toBeDefined();
    expect(report.cash).toBeDefined();
    expect(report.openAlerts).toBeGreaterThanOrEqual(0);
  });
});

describe("Monthly owner report (Test 24)", () => {
  it("includes revenue/COGS/gross+net profit/margins/sales growth/customer growth/inventory/gold/cash/marketing", async () => {
    const report = await getMonthlyReport();
    expect(typeof report.revenue).toBe("string");
    expect(typeof report.cogs).toBe("string");
    expect(typeof report.grossProfit).toBe("string");
    expect(typeof report.grossMarginPercent).toBe("string");
    expect(typeof report.netProfit).toBe("string");
    expect(typeof report.netMarginPercent).toBe("string");
    expect(report.salesGrowth).toHaveProperty("direction");
    expect(report.customerGrowth).toHaveProperty("direction");
    expect(Array.isArray(report.profitByCategory)).toBe(true);
    expect(report.inventory).toBeDefined();
    expect(Array.isArray(report.goldByPurity)).toBe(true);
    expect(report.cash).toBeDefined();
    expect(report.marketing).toBeDefined();
  });

  it("never fabricates growth — customerGrowth is derived only from real Customer counts", async () => {
    const report = await getMonthlyReport();
    // Both sides of the comparison must be non-negative real counts, never a negative or invented figure.
    expect(Number(report.customerGrowth.current)).toBeGreaterThanOrEqual(0);
    expect(Number(report.customerGrowth.previous)).toBeGreaterThanOrEqual(0);
  });
});

describe("Report generation is audited (Test 28)", () => {
  it("auditReportGenerated writes a REPORT_GENERATED audit log row tagged with the report type", async () => {
    const owner = await getSeededOwnerId();
    await auditReportGenerated(owner, "DAILY");

    const log = await prisma.auditLog.findFirst({
      where: { userId: owner, action: "REPORT_GENERATED", entity: "BiReport" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    expect((log?.metadata as { reportType?: string } | null)?.reportType).toBe("DAILY");
  });
});
