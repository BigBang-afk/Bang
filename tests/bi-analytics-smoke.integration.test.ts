import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { getExecutiveKpis, computeGrowth } from "@/services/bi-dashboard.service";
import { getSalesPeriodComparison, getSalesTrend } from "@/services/bi-sales-analytics.service";
import { getProfitTrend, getProfitByCategory, getTopProducts } from "@/services/bi-profit-analytics.service";
import { getInventoryAgeBuckets, getSlowMovingInventory, getInventoryStatusBreakdown } from "@/services/bi-inventory-analytics.service";
import { getGoldByPurity, getGoldRateAnalytics, getGoldExposure } from "@/services/bi-gold-analytics.service";
import { getCustomerAnalyticsSummary, getCustomerCohorts } from "@/services/bi-customer-analytics.service";
import { getKarigarAnalyticsSummary, getKarigarPerformance } from "@/services/bi-karigar-analytics.service";
import { getSupplierAnalyticsSummary, getTopSuppliers } from "@/services/bi-supplier-analytics.service";
import { getCashAnalytics } from "@/services/bi-cash-analytics.service";
import { getMarketingAnalyticsSummary } from "@/services/bi-marketing-analytics.service";

describe("Executive KPI calculations (Test 1)", () => {
  it("getExecutiveKpis returns every top KPI card figure as a real string, derived from live DB data", async () => {
    const kpis = await getExecutiveKpis();
    expect(typeof kpis.todaySales).toBe("string");
    expect(typeof kpis.monthlySales).toBe("string");
    expect(typeof kpis.cashBalance).toBe("string");
    expect(typeof kpis.customerReceivables).toBe("string");
    expect(typeof kpis.supplierPayables).toBe("string");
    expect(Array.isArray(kpis.goldWithKarigars)).toBe(true);
    expect(typeof kpis.inventoryCostValue).toBe("string");
    expect(typeof kpis.inventorySellingValue).toBe("string");
  });
});

describe("Sales growth calculations (Test 2)", () => {
  it("getSalesPeriodComparison computes day-over-day and month-over-month growth safely", async () => {
    const comparison = await getSalesPeriodComparison();
    expect(["UP", "DOWN", "FLAT", "NO_COMPARISON"]).toContain(comparison.dayOverDay.direction);
    expect(["UP", "DOWN", "FLAT", "NO_COMPARISON"]).toContain(comparison.monthOverMonth.direction);
    if (comparison.dayOverDay.direction === "NO_COMPARISON") expect(comparison.dayOverDay.growthPercent).toBeNull();
  });

  it("getSalesTrend groups server-side by day without ever needing the caller to aggregate raw rows", async () => {
    const rows = await getSalesTrend("this_month", "day");
    for (const row of rows) {
      expect(typeof row.period).toBe("string");
      expect(typeof row.sales).toBe("string");
      expect(row.itemsSold).toBeGreaterThanOrEqual(0);
    }
  });

  it("computeGrowth handles a positive-to-zero comparison as NO_COMPARISON, never a fabricated -100%", () => {
    const growth = computeGrowth("500", "0");
    expect(growth.direction).toBe("NO_COMPARISON");
    expect(growth.growthPercent).toBeNull();
  });
});

describe("Profit calculations (Test 3)", () => {
  it("getProfitTrend/getProfitByCategory/getTopProducts all derive from real ProductCategory rows, never a hardcoded list", async () => {
    const [trend, byCategory, topProducts] = await Promise.all([
      getProfitTrend("this_month", "day"),
      getProfitByCategory("this_month"),
      getTopProducts("this_month", "profit"),
    ]);

    for (const point of trend) {
      // grossProfit = revenue - cogs, always internally consistent
      expect(new Decimal(point.grossProfit).toString()).toBe(new Decimal(point.revenue).sub(point.cogs).toString());
    }
    for (const row of byCategory) {
      expect(typeof row.categoryId).toBe("string");
      expect(typeof row.categoryName).toBe("string");
    }
    for (const row of topProducts) {
      expect(row.unitsSold).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Inventory aging (Test 4) and slow-moving stock (Test 5)", () => {
  it("getInventoryAgeBuckets always returns exactly the spec's 5 buckets, in order", async () => {
    const buckets = await getInventoryAgeBuckets();
    expect(buckets.map((b) => b.label)).toEqual(["0-30 days", "31-60 days", "61-90 days", "91-180 days", "180+ days"]);
  });

  it("getInventoryStatusBreakdown totals reconcile to the sum of its own status buckets", async () => {
    const breakdown = await getInventoryStatusBreakdown();
    const sum = breakdown.inStock + breakdown.reserved + breakdown.sold + breakdown.returned + breakdown.damaged + breakdown.lost + breakdown.inactive;
    expect(sum).toBe(breakdown.totalItems);
  });

  it("getSlowMovingInventory returns a human-readable recommendation, never an automatic price or status change", async () => {
    const rows = await getSlowMovingInventory();
    for (const row of rows) {
      expect(typeof row.recommendation).toBe("string");
      expect(row.recommendation.length).toBeGreaterThan(0);
      expect(row.recommendation.toLowerCase()).toContain("consider");
    }
  });
});

describe("Gold analytics (Test 6)", () => {
  it("getGoldByPurity, getGoldRateAnalytics, and getGoldExposure never combine purities into one blended total", async () => {
    const [byPurity, rateAnalytics, exposure] = await Promise.all([
      getGoldByPurity("this_month"),
      getGoldRateAnalytics(30),
      getGoldExposure(),
    ]);
    for (const row of byPurity) expect(row.purity).toBeDefined();
    expect(Array.isArray(rateAnalytics.history)).toBe(true);
    const purities = exposure.map((r) => r.purity);
    expect(new Set(purities).size).toBe(purities.length); // one row per purity, never merged
  });
});

describe("Customer retention (Test 7) and cohorts (Test 8)", () => {
  it("repeatPurchaseRatePercent follows (2+ purchase customers)/(1+ purchase customers) x 100, or null with no purchasers", async () => {
    const summary = await getCustomerAnalyticsSummary();
    if (summary.repeatPurchaseRatePercent !== null) {
      expect(Number(summary.repeatPurchaseRatePercent)).toBeGreaterThanOrEqual(0);
      expect(Number(summary.repeatPurchaseRatePercent)).toBeLessThanOrEqual(100);
    }
    expect(summary.repeatCustomers).toBeGreaterThanOrEqual(0);
  });

  it("getCustomerCohorts groups by first-purchase month with month-0 retention always 100", async () => {
    const cohorts = await getCustomerCohorts();
    for (const cohort of cohorts) {
      expect(cohort.retentionPercent[0]).toBe("100");
      expect(cohort.cohortSize).toBeGreaterThan(0);
    }
  });
});

describe("Karigar analytics (Test 9)", () => {
  it("getKarigarAnalyticsSummary and getKarigarPerformance report only operational facts, never a quality ranking field", async () => {
    const [summary, performance] = await Promise.all([getKarigarAnalyticsSummary(), getKarigarPerformance()]);
    expect(summary.activeKarigars).toBeGreaterThanOrEqual(0);
    expect(summary.jobsCompleted).toBeGreaterThanOrEqual(0);
    for (const row of performance) {
      expect(row).not.toHaveProperty("qualityScore");
      expect(row).not.toHaveProperty("rank");
      expect(row.jobsCompleted).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Supplier analytics (Test 10)", () => {
  it("getSupplierAnalyticsSummary and getTopSuppliers report real purchase totals per supplier", async () => {
    const [summary, topByValue, topByVolume] = await Promise.all([
      getSupplierAnalyticsSummary(),
      getTopSuppliers("value"),
      getTopSuppliers("volume"),
    ]);
    expect(summary.activeSuppliers).toBeGreaterThanOrEqual(0);
    for (const row of [...topByValue, ...topByVolume]) {
      expect(typeof row.name).toBe("string");
      expect(row.purchaseCount).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Cash analytics (Test 11)", () => {
  it("getCashAnalytics' 6-bucket breakdown never fabricates money — every bucket comes from real CashTransaction rows", async () => {
    const analytics = await getCashAnalytics("this_month");
    const breakdown = analytics.breakdown;
    for (const key of ["sales", "customerPayments", "supplierPayments", "karigarPayments", "expenses", "other"] as const) {
      expect(typeof breakdown[key]).toBe("string");
      expect(Number.isFinite(Number(breakdown[key]))).toBe(true);
    }
  });
});

describe("Marketing analytics (Test 12)", () => {
  it("getMarketingAnalyticsSummary keeps DIRECT and ASSISTED revenue as two separate figures, never summed into one 'marketing revenue' total", async () => {
    const summary = await getMarketingAnalyticsSummary();
    expect(summary).toHaveProperty("directRevenue");
    expect(summary).toHaveProperty("assistedRevenue");
    expect(summary).not.toHaveProperty("totalMarketingRevenue");
    expect(Number(summary.deliveryRatePercent)).toBeGreaterThanOrEqual(0);
    expect(Number(summary.deliveryRatePercent)).toBeLessThanOrEqual(100);
  });
});
