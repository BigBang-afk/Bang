import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";

/**
 * Phase 8 configurable thresholds — see BUSINESS-INTELLIGENCE.md
 * "Settings". Same "settings as data, read fresh on every call" pattern
 * as marketing-settings.service.ts.
 */

export type BiSettings = {
  lowStockCategoryThreshold: number;
  agingStockDays: number;
  cashShortageThreshold: number;
  highBalanceThreshold: number;
  salesDropPercent: number;
  expenseSpikePercent: number;
  unusualTransactionAmount: number;
  forecastMinDaysInsufficient: number;
  forecastMinDaysStandard: number;
};

const KEYS = [
  SETTINGS_KEYS.BI_LOW_STOCK_CATEGORY_THRESHOLD,
  SETTINGS_KEYS.BI_AGING_STOCK_DAYS,
  SETTINGS_KEYS.BI_CASH_SHORTAGE_THRESHOLD,
  SETTINGS_KEYS.BI_HIGH_BALANCE_THRESHOLD,
  SETTINGS_KEYS.BI_SALES_DROP_PERCENT,
  SETTINGS_KEYS.BI_EXPENSE_SPIKE_PERCENT,
  SETTINGS_KEYS.BI_UNUSUAL_TRANSACTION_AMOUNT,
  SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_INSUFFICIENT,
  SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_STANDARD,
];

export async function getBiSettings(): Promise<BiSettings> {
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: KEYS } } });
  const value = (key: string, fallback: number) => {
    const row = rows.find((r) => r.key === key);
    const parsed = row ? Number.parseFloat(row.value) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    lowStockCategoryThreshold: value(SETTINGS_KEYS.BI_LOW_STOCK_CATEGORY_THRESHOLD, 5),
    agingStockDays: value(SETTINGS_KEYS.BI_AGING_STOCK_DAYS, 90),
    cashShortageThreshold: value(SETTINGS_KEYS.BI_CASH_SHORTAGE_THRESHOLD, 1000),
    highBalanceThreshold: value(SETTINGS_KEYS.BI_HIGH_BALANCE_THRESHOLD, 500000),
    salesDropPercent: value(SETTINGS_KEYS.BI_SALES_DROP_PERCENT, 20),
    expenseSpikePercent: value(SETTINGS_KEYS.BI_EXPENSE_SPIKE_PERCENT, 50),
    unusualTransactionAmount: value(SETTINGS_KEYS.BI_UNUSUAL_TRANSACTION_AMOUNT, 200000),
    forecastMinDaysInsufficient: value(SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_INSUFFICIENT, 30),
    forecastMinDaysStandard: value(SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_STANDARD, 90),
  };
}

export async function updateBiSettings(input: BiSettings, userId: string): Promise<void> {
  const updates: { key: string; value: string }[] = [
    { key: SETTINGS_KEYS.BI_LOW_STOCK_CATEGORY_THRESHOLD, value: String(input.lowStockCategoryThreshold) },
    { key: SETTINGS_KEYS.BI_AGING_STOCK_DAYS, value: String(input.agingStockDays) },
    { key: SETTINGS_KEYS.BI_CASH_SHORTAGE_THRESHOLD, value: String(input.cashShortageThreshold) },
    { key: SETTINGS_KEYS.BI_HIGH_BALANCE_THRESHOLD, value: String(input.highBalanceThreshold) },
    { key: SETTINGS_KEYS.BI_SALES_DROP_PERCENT, value: String(input.salesDropPercent) },
    { key: SETTINGS_KEYS.BI_EXPENSE_SPIKE_PERCENT, value: String(input.expenseSpikePercent) },
    { key: SETTINGS_KEYS.BI_UNUSUAL_TRANSACTION_AMOUNT, value: String(input.unusualTransactionAmount) },
    { key: SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_INSUFFICIENT, value: String(input.forecastMinDaysInsufficient) },
    { key: SETTINGS_KEYS.BI_FORECAST_MIN_DAYS_STANDARD, value: String(input.forecastMinDaysStandard) },
  ];

  for (const update of updates) {
    await prisma.systemSetting.upsert({
      where: { key: update.key },
      update: { value: update.value, updatedById: userId },
      create: { key: update.key, value: update.value, updatedById: userId },
    });
  }

  await writeAuditLog({ userId, action: "SETTINGS_CHANGED", entity: "SystemSetting", metadata: { module: "business_intelligence" } });
}
