import "server-only";
import { getSystemSetting } from "@/services/system-setting.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import { DEFAULT_BUSINESS_TIMEZONE, resolveBusinessDateInTimezone } from "@/lib/business-date";

/**
 * Phase 6 settings readers — configurable business timezone, receivable
 * aging buckets, and the daily-closing unpaid-balances flag. See
 * ACCOUNTING.md "Business date" and FINANCIAL-REPORTS.md "Receivable
 * aging".
 */

export async function getBusinessTimezone(): Promise<string> {
  const value = await getSystemSetting(SETTINGS_KEYS.BUSINESS_TIMEZONE);
  return value || DEFAULT_BUSINESS_TIMEZONE;
}

/** "Today" resolved in the configured business timezone — used by Daily Closing and report date presets. */
export async function getCurrentBusinessDate(): Promise<Date> {
  const timezone = await getBusinessTimezone();
  return resolveBusinessDateInTimezone(new Date(), timezone);
}

const DEFAULT_AGING_BUCKETS = [30, 60, 90];

/** Day breakpoints for the receivable aging report, e.g. [30, 60, 90] → Current / 1-30 / 31-60 / 61-90 / 90+. */
export async function getReceivableAgingBucketDays(): Promise<number[]> {
  const raw = await getSystemSetting(SETTINGS_KEYS.RECEIVABLE_AGING_BUCKET_DAYS);
  if (!raw) return DEFAULT_AGING_BUCKETS;
  const parsed = raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  return parsed.length > 0 ? parsed : DEFAULT_AGING_BUCKETS;
}

export async function getFlagUnpaidBalancesOnClosing(): Promise<boolean> {
  const value = await getSystemSetting(SETTINGS_KEYS.FLAG_UNPAID_BALANCES_ON_CLOSING);
  return value === "true";
}
