import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { getSystemSetting } from "@/services/system-setting.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import { getCashBalance } from "@/services/cash-transaction.service";

/**
 * Forecasting Engine — see FORECASTING.md. Every forecast is a plain
 * statistical projection off real historical rows (recent trend + a
 * day-of-week factor where there's enough history to support one) — never
 * an AI-generated guess, and never presented as anything but an ESTIMATE.
 * A forecast for a metric with too little history reports
 * INSUFFICIENT_DATA instead of a fabricated number — see "Data
 * sufficiency" below, the load-bearing safety rule this whole file
 * enforces before computing anything.
 */

export type ForecastConfidence = "INSUFFICIENT_DATA" | "LOW_CONFIDENCE" | "STANDARD_CONFIDENCE";
export type ForecastPeriodDays = 7 | 30 | 90;

async function getConfidenceThresholds(): Promise<{ insufficient: number; standard: number }> {
  const [insufficient, standard] = await Promise.all([
    getSystemSetting(SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_INSUFFICIENT),
    getSystemSetting(SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_STANDARD),
  ]);
  return {
    insufficient: Number.parseInt(insufficient, 10) || 30,
    standard: Number.parseInt(standard, 10) || 90,
  };
}

/** Classifies confidence purely from how many distinct days of real history exist — see FORECASTING.md "Data sufficiency". Configurable via BI_FORECAST_MIN_DAYS_INSUFFICIENT / BI_FORECAST_MIN_DAYS_STANDARD. */
export async function classifyDataSufficiency(historyDaysAvailable: number): Promise<ForecastConfidence> {
  const thresholds = await getConfidenceThresholds();
  if (historyDaysAvailable < thresholds.insufficient) return "INSUFFICIENT_DATA";
  if (historyDaysAvailable < thresholds.standard) return "LOW_CONFIDENCE";
  return "STANDARD_CONFIDENCE";
}

type DailySeries = { date: Date; value: Decimal }[];

/** A simple, bounded trend + day-of-week model — deliberately conservative (daily growth clamped to ±5%) so a short noisy window can never extrapolate into an absurd number. Not a claim of statistical rigor; a transparent, inspectable estimate. */
function projectSeries(series: DailySeries, periodDays: number): { total: Decimal; dailyAverage: Decimal } {
  if (series.length === 0) return { total: new Decimal(0), dailyAverage: new Decimal(0) };

  const overallAverage = series.reduce((sum, p) => sum.add(p.value), new Decimal(0)).div(series.length);

  const third = Math.max(1, Math.floor(series.length / 3));
  const oldest = series.slice(0, third);
  const recent = series.slice(-third);
  const oldAvg = oldest.reduce((s, p) => s.add(p.value), new Decimal(0)).div(oldest.length);
  const recentAvg = recent.reduce((s, p) => s.add(p.value), new Decimal(0)).div(recent.length);

  let dailyGrowthRate = new Decimal(0);
  if (oldAvg.gt(0)) {
    const spanDays = Math.max(1, series.length - third);
    const ratio = recentAvg.div(oldAvg);
    // (ratio)^(1/spanDays) - 1, computed via ln/exp since Decimal has no fractional pow.
    const rate = Decimal.exp(Decimal.ln(ratio.gt(0) ? ratio : new Decimal(0.0001)).div(spanDays)).sub(1);
    dailyGrowthRate = Decimal.max(-0.05, Decimal.min(0.05, rate));
  }

  const dayOfWeekTotals = new Map<number, Decimal>();
  const dayOfWeekCounts = new Map<number, number>();
  for (const point of series) {
    const dow = point.date.getUTCDay();
    dayOfWeekTotals.set(dow, (dayOfWeekTotals.get(dow) ?? new Decimal(0)).add(point.value));
    dayOfWeekCounts.set(dow, (dayOfWeekCounts.get(dow) ?? 0) + 1);
  }
  const enoughForSeasonality = [...dayOfWeekCounts.values()].every((c) => c >= 3);
  const dayOfWeekFactor = (dow: number): Decimal => {
    if (!enoughForSeasonality || overallAverage.isZero()) return new Decimal(1);
    const count = dayOfWeekCounts.get(dow) ?? 0;
    if (count === 0) return new Decimal(1);
    const avgForDay = (dayOfWeekTotals.get(dow) ?? new Decimal(0)).div(count);
    return avgForDay.div(overallAverage);
  };

  let total = new Decimal(0);
  const lastDate = series[series.length - 1].date;
  for (let d = 1; d <= periodDays; d++) {
    const futureDate = new Date(lastDate.getTime() + d * 24 * 60 * 60 * 1000);
    const trendMultiplier = new Decimal(1).add(dailyGrowthRate).pow(d);
    const dayValue = overallAverage.mul(trendMultiplier).mul(dayOfWeekFactor(futureDate.getUTCDay()));
    total = total.add(Decimal.max(0, dayValue));
  }

  return { total, dailyAverage: overallAverage };
}

async function getDailySalesSeries(lookbackDays: number): Promise<DailySeries> {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<{ day: Date; total: Decimal }[]>`
    SELECT date_trunc('day', "saleDate") AS day, COALESCE(SUM("grandTotal"), 0) AS total
    FROM sales
    WHERE "saleDate" >= ${since} AND status != 'RETURNED'
    GROUP BY day
    ORDER BY day ASC
  `;
  return rows.map((r) => ({ date: r.day, value: new Decimal(r.total) }));
}

export type SalesForecast = {
  periodDays: ForecastPeriodDays;
  confidence: ForecastConfidence;
  historicalDailyAverage: string;
  historyDaysAvailable: number;
  /** null when confidence is INSUFFICIENT_DATA — never a fabricated total. */
  forecastTotal: string | null;
  label: "ESTIMATE";
  basis: "Based on historical daily sales data.";
};

/** Historical completed sales only; trend + day-of-week pattern where there's enough data. Reports INSUFFICIENT_DATA rather than guessing when history is thin — see the spec's CRITICAL forecast test. */
export async function getSalesForecast(periodDays: ForecastPeriodDays): Promise<SalesForecast> {
  const series = await getDailySalesSeries(180);
  const historyDaysAvailable = series.length;
  const confidence = await classifyDataSufficiency(historyDaysAvailable);

  if (confidence === "INSUFFICIENT_DATA") {
    const dailyAverage = series.length > 0 ? series.reduce((s, p) => s.add(p.value), new Decimal(0)).div(series.length) : new Decimal(0);
    return {
      periodDays,
      confidence,
      historicalDailyAverage: dailyAverage.toDecimalPlaces(2).toString(),
      historyDaysAvailable,
      forecastTotal: null,
      label: "ESTIMATE",
      basis: "Based on historical daily sales data.",
    };
  }

  const { total, dailyAverage } = projectSeries(series, periodDays);
  return {
    periodDays,
    confidence,
    historicalDailyAverage: dailyAverage.toDecimalPlaces(2).toString(),
    historyDaysAvailable,
    forecastTotal: total.toDecimalPlaces(2).toString(),
    label: "ESTIMATE",
    basis: "Based on historical daily sales data.",
  };
}

export type ExpenseForecast = {
  periodDays: ForecastPeriodDays;
  confidence: ForecastConfidence;
  historyDaysAvailable: number;
  recurringMonthlyEstimate: string;
  variableMonthlyEstimate: string;
  forecastTotal: string | null;
  label: "ESTIMATE";
  basis: "Based on historical expenses over the last 3 months, split into recurring (appeared in every month) and variable (did not) categories.";
};

/** A category counts as "recurring" only if it had at least one ACTIVE expense in every one of the last 3 calendar months — a plain, inspectable rule, not a judgment call. */
export async function getExpenseForecast(periodDays: ForecastPeriodDays): Promise<ExpenseForecast> {
  const now = new Date();
  const monthStarts = [0, 1, 2].map((i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)));
  const historyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));

  const rows = await prisma.expense.findMany({
    where: { status: "ACTIVE", expenseDate: { gte: historyStart } },
    select: { categoryId: true, amount: true, expenseDate: true },
  });

  const historyDaysAvailable = Math.floor((now.getTime() - historyStart.getTime()) / (1000 * 60 * 60 * 24));
  const confidence = await classifyDataSufficiency(historyDaysAvailable);

  const monthKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
  const monthsPresentByCategory = new Map<string, Set<string>>();
  const totalByCategory = new Map<string, Decimal>();
  for (const row of rows) {
    if (!monthsPresentByCategory.has(row.categoryId)) monthsPresentByCategory.set(row.categoryId, new Set());
    monthsPresentByCategory.get(row.categoryId)!.add(monthKey(row.expenseDate));
    totalByCategory.set(row.categoryId, (totalByCategory.get(row.categoryId) ?? new Decimal(0)).add(row.amount.toString()));
  }
  const requiredMonths = new Set(monthStarts.map(monthKey));

  let recurringMonthly = new Decimal(0);
  let variableMonthly = new Decimal(0);
  for (const [categoryId, total] of totalByCategory) {
    const monthsPresent = monthsPresentByCategory.get(categoryId) ?? new Set();
    const isRecurring = [...requiredMonths].every((m) => monthsPresent.has(m));
    const monthlyAverage = total.div(3);
    if (isRecurring) recurringMonthly = recurringMonthly.add(monthlyAverage);
    else variableMonthly = variableMonthly.add(monthlyAverage);
  }

  const monthlyTotal = recurringMonthly.add(variableMonthly);
  const forecastTotal = confidence === "INSUFFICIENT_DATA" ? null : monthlyTotal.div(30).mul(periodDays).toDecimalPlaces(2).toString();

  return {
    periodDays,
    confidence,
    historyDaysAvailable,
    recurringMonthlyEstimate: recurringMonthly.toDecimalPlaces(2).toString(),
    variableMonthlyEstimate: variableMonthly.toDecimalPlaces(2).toString(),
    forecastTotal,
    label: "ESTIMATE",
    basis: "Based on historical expenses over the last 3 months, split into recurring (appeared in every month) and variable (did not) categories.",
  };
}

export type CashForecast = {
  periodDays: ForecastPeriodDays;
  confidence: ForecastConfidence;
  openingCash: string;
  expectedSalesReceipts: string | null;
  expectedCustomerPayments: string | null;
  expectedSupplierPayments: string | null;
  expectedExpenses: string | null;
  projectedCash: string | null;
  label: "ESTIMATE";
  basis: "Opening cash plus estimated future receipts and payments, each itself an ESTIMATE — never guaranteed cash.";
};

/** Never treats a forecasted inflow as committed — every input feeding the projection is itself labeled an estimate, and the whole projection is null (not a number) when the underlying sales forecast has insufficient data. */
export async function getCashForecast(periodDays: ForecastPeriodDays): Promise<CashForecast> {
  const [openingCash, salesForecast, expenseForecast, customerPaymentHistory, supplierPaymentHistory] = await Promise.all([
    getCashBalance(),
    getSalesForecast(periodDays),
    getExpenseForecast(periodDays),
    prisma.cashTransaction.aggregate({
      where: { transactionType: "CUSTOMER_PAYMENT", createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: {
        transactionType: { in: ["PURCHASE_PAYMENT", "SUPPLIER_PAYMENT"] },
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      _sum: { amount: true },
    }),
  ]);

  if (salesForecast.confidence === "INSUFFICIENT_DATA") {
    return {
      periodDays,
      confidence: "INSUFFICIENT_DATA",
      openingCash,
      expectedSalesReceipts: null,
      expectedCustomerPayments: null,
      expectedSupplierPayments: null,
      expectedExpenses: null,
      projectedCash: null,
      label: "ESTIMATE",
      basis: "Opening cash plus estimated future receipts and payments, each itself an ESTIMATE — never guaranteed cash.",
    };
  }

  const dailyCustomerPayments = new Decimal(customerPaymentHistory._sum.amount ?? 0).div(90);
  const dailySupplierPayments = new Decimal(supplierPaymentHistory._sum.amount ?? 0).div(90);
  const expectedCustomerPayments = dailyCustomerPayments.mul(periodDays);
  const expectedSupplierPayments = dailySupplierPayments.mul(periodDays);
  const expectedSalesReceipts = new Decimal(salesForecast.forecastTotal ?? 0);
  const expectedExpenses = new Decimal(expenseForecast.forecastTotal ?? 0);

  const projectedCash = new Decimal(openingCash)
    .add(expectedSalesReceipts)
    .add(expectedCustomerPayments)
    .sub(expectedSupplierPayments)
    .sub(expectedExpenses);

  return {
    periodDays,
    confidence: salesForecast.confidence,
    openingCash,
    expectedSalesReceipts: expectedSalesReceipts.toDecimalPlaces(2).toString(),
    expectedCustomerPayments: expectedCustomerPayments.toDecimalPlaces(2).toString(),
    expectedSupplierPayments: expectedSupplierPayments.toDecimalPlaces(2).toString(),
    expectedExpenses: expectedExpenses.toDecimalPlaces(2).toString(),
    projectedCash: projectedCash.toDecimalPlaces(2).toString(),
    label: "ESTIMATE",
    basis: "Opening cash plus estimated future receipts and payments, each itself an ESTIMATE — never guaranteed cash.",
  };
}

export type InventoryDemandForecastRow = {
  productId: string;
  productName: string;
  categoryName: string;
  averageDailySalesRate: string;
  currentStock: number;
  /** null when the sales rate is 0 — "infinite days of stock" is reported as null, never a fabricated number. */
  estimatedDaysOfStock: string | null;
  suggestedReplenishment: boolean;
};

/** Only for products with enough sale history in the lookback window (>= 5 completed sales) — everything else is silently omitted rather than guessed. Never auto-creates a purchase order; `suggestedReplenishment` is a flag for a human to act on. */
export async function getInventoryDemandForecast(lookbackDays = 90, minSalesForEstimate = 5): Promise<InventoryDemandForecastRow[]> {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const salesByProduct = await prisma.saleItem.groupBy({
    by: ["productName"],
    where: { sale: { saleDate: { gte: since }, status: { not: "RETURNED" } } },
    _count: true,
  });

  const eligible = salesByProduct.filter((row) => row._count >= minSalesForEstimate);
  if (eligible.length === 0) return [];

  const currentStock = await prisma.inventoryItem.groupBy({
    by: ["productId"],
    where: { archivedAt: null, status: "IN_STOCK" },
    _count: true,
  });
  const products = await prisma.product.findMany({
    where: { name: { in: eligible.map((e) => e.productName) } },
    select: { id: true, name: true, category: { select: { name: true } } },
  });
  const stockByProductId = new Map(currentStock.map((s) => [s.productId, s._count]));

  return eligible
    .map((row) => {
      const product = products.find((p) => p.name === row.productName);
      if (!product) return null;
      const stock = stockByProductId.get(product.id) ?? 0;
      const dailyRate = new Decimal(row._count).div(lookbackDays);
      const estimatedDaysOfStock = dailyRate.gt(0) ? new Decimal(stock).div(dailyRate).toDecimalPlaces(0).toString() : null;
      return {
        productId: product.id,
        productName: product.name,
        categoryName: product.category.name,
        averageDailySalesRate: dailyRate.toDecimalPlaces(3).toString(),
        currentStock: stock,
        estimatedDaysOfStock,
        suggestedReplenishment: estimatedDaysOfStock !== null && Number(estimatedDaysOfStock) < 14,
      };
    })
    .filter((row): row is InventoryDemandForecastRow => row !== null)
    .sort((a, b) => Number(a.estimatedDaysOfStock ?? Infinity) - Number(b.estimatedDaysOfStock ?? Infinity));
}

export type CustomerPurchaseForecast = {
  periodDays: ForecastPeriodDays;
  confidence: ForecastConfidence;
  historicalDailyOrderAverage: string;
  forecastOrderCount: number | null;
  label: "ESTIMATE";
  basis: "Based on historical daily completed-order counts.";
};

/** Expected purchase VOLUME (order count), not which specific customers — a plain trend projection of daily completed-sale counts, same data-sufficiency guard as the sales forecast. */
export async function getCustomerPurchaseForecast(periodDays: ForecastPeriodDays): Promise<CustomerPurchaseForecast> {
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "saleDate") AS day, COUNT(*) AS count
    FROM sales
    WHERE "saleDate" >= ${since} AND status != 'RETURNED'
    GROUP BY day
    ORDER BY day ASC
  `;
  const series: DailySeries = rows.map((r) => ({ date: r.day, value: new Decimal(Number(r.count)) }));
  const confidence = await classifyDataSufficiency(series.length);

  if (confidence === "INSUFFICIENT_DATA") {
    return {
      periodDays,
      confidence,
      historicalDailyOrderAverage: "0",
      forecastOrderCount: null,
      label: "ESTIMATE",
      basis: "Based on historical daily completed-order counts.",
    };
  }

  const { total, dailyAverage } = projectSeries(series, periodDays);
  return {
    periodDays,
    confidence,
    historicalDailyOrderAverage: dailyAverage.toDecimalPlaces(2).toString(),
    forecastOrderCount: Math.round(total.toNumber()),
    label: "ESTIMATE",
    basis: "Based on historical daily completed-order counts.",
  };
}
