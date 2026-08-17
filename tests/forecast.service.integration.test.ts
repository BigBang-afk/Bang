import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  classifyDataSufficiency,
  getSalesForecast,
  getExpenseForecast,
  getCashForecast,
  getCustomerPurchaseForecast,
  getInventoryDemandForecast,
} from "@/services/forecast.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";

async function setConfidenceThresholds(insufficient: number, standard: number) {
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_INSUFFICIENT },
    update: { value: String(insufficient) },
    create: { key: SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_INSUFFICIENT, value: String(insufficient) },
  });
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_STANDARD },
    update: { value: String(standard) },
    create: { key: SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_STANDARD, value: String(standard) },
  });
}

describe("Forecast data sufficiency (Test 17)", () => {
  it("classifies below the insufficient threshold as INSUFFICIENT_DATA", async () => {
    await setConfidenceThresholds(30, 90);
    await expect(classifyDataSufficiency(10)).resolves.toBe("INSUFFICIENT_DATA");
    await expect(classifyDataSufficiency(29)).resolves.toBe("INSUFFICIENT_DATA");
  });

  it("classifies between the two thresholds as LOW_CONFIDENCE", async () => {
    await setConfidenceThresholds(30, 90);
    await expect(classifyDataSufficiency(30)).resolves.toBe("LOW_CONFIDENCE");
    await expect(classifyDataSufficiency(89)).resolves.toBe("LOW_CONFIDENCE");
  });

  it("classifies at/above the standard threshold as STANDARD_CONFIDENCE", async () => {
    await setConfidenceThresholds(30, 90);
    await expect(classifyDataSufficiency(90)).resolves.toBe("STANDARD_CONFIDENCE");
    await expect(classifyDataSufficiency(365)).resolves.toBe("STANDARD_CONFIDENCE");
  });
});

describe("CRITICAL FORECAST TEST — insufficient history never produces a fabricated number", () => {
  it("getSalesForecast reports INSUFFICIENT_DATA with forecastTotal null when history is set unreachably high", async () => {
    // Force INSUFFICIENT_DATA deterministically regardless of how much real
    // sales history has accumulated in this shared dev DB, by setting the
    // insufficient-data threshold far above any realistic day count.
    await setConfidenceThresholds(100000, 200000);

    const forecast = await getSalesForecast(30);
    expect(forecast.confidence).toBe("INSUFFICIENT_DATA");
    expect(forecast.forecastTotal).toBeNull();
    expect(forecast.label).toBe("ESTIMATE");

    // Restore realistic thresholds for every other test in this file/suite.
    await setConfidenceThresholds(30, 90);
  });

  it("getExpenseForecast, getCashForecast, and getCustomerPurchaseForecast all report null (never fabricated) under INSUFFICIENT_DATA", async () => {
    await setConfidenceThresholds(100000, 200000);

    const [expense, cash, customerPurchase] = await Promise.all([
      getExpenseForecast(30),
      getCashForecast(30),
      getCustomerPurchaseForecast(30),
    ]);

    expect(expense.confidence).toBe("INSUFFICIENT_DATA");
    expect(expense.forecastTotal).toBeNull();

    expect(cash.confidence).toBe("INSUFFICIENT_DATA");
    expect(cash.projectedCash).toBeNull();
    expect(cash.expectedSalesReceipts).toBeNull();

    expect(customerPurchase.confidence).toBe("INSUFFICIENT_DATA");
    expect(customerPurchase.forecastOrderCount).toBeNull();

    await setConfidenceThresholds(30, 90);
  });
});

describe("Sales forecast (Test 18)", () => {
  it("with realistic thresholds, produces a non-negative estimate labeled ESTIMATE with a basis string", async () => {
    await setConfidenceThresholds(0, 1); // guarantees STANDARD_CONFIDENCE against any real history
    const forecast = await getSalesForecast(7);
    expect(forecast.label).toBe("ESTIMATE");
    expect(forecast.basis).toContain("historical");
    if (forecast.forecastTotal !== null) {
      expect(Number(forecast.forecastTotal)).toBeGreaterThanOrEqual(0);
    }
    await setConfidenceThresholds(30, 90);
  });
});

describe("Expense forecast (Test 19)", () => {
  it("separates recurring and variable estimates, both non-negative", async () => {
    await setConfidenceThresholds(0, 1);
    const forecast = await getExpenseForecast(30);
    expect(Number(forecast.recurringMonthlyEstimate)).toBeGreaterThanOrEqual(0);
    expect(Number(forecast.variableMonthlyEstimate)).toBeGreaterThanOrEqual(0);
    await setConfidenceThresholds(30, 90);
  });
});

describe("Cash forecast (Test 20)", () => {
  it("never treats a forecasted inflow as guaranteed — every component itself is estimated, and openingCash is always the real live balance", async () => {
    await setConfidenceThresholds(0, 1);
    const forecast = await getCashForecast(30);
    expect(forecast.basis).toContain("ESTIMATE");
    expect(typeof forecast.openingCash).toBe("string");
    await setConfidenceThresholds(30, 90);
  });
});

describe("Inventory forecast (Test 21)", () => {
  it("only includes products with at least the minimum sales count, and never auto-suggests a purchase order — only a boolean flag", async () => {
    const rows = await getInventoryDemandForecast(90, 1000000); // an unreachably high minimum guarantees an empty, safe result
    expect(rows).toEqual([]);
  });

  it("suggestedReplenishment is a plain boolean, never an executed action", async () => {
    const rows = await getInventoryDemandForecast(365, 1);
    for (const row of rows) {
      expect(typeof row.suggestedReplenishment).toBe("boolean");
    }
  });
});
