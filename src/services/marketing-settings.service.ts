import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";

/**
 * Phase 7 marketing settings — see AI-MARKETING.md "Settings". All are
 * plain SystemSetting rows, the same "settings as data, never hardcoded"
 * pattern every prior phase uses. Read fresh on every call.
 */

export type MarketingSettings = {
  maxMessagesPerCustomerPerDay: number;
  maxMessagesPerCustomerPerWeek: number;
  minCampaignGapHours: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  maxRetries: number;
  attributionWindowDays: number;
  rfmPeriodDays: number;
  engagementScoreWeights: { recency: number; frequency: number; monetary: number; engagement: number };
}

const KEYS = [
  SETTINGS_KEYS.MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_DAY,
  SETTINGS_KEYS.MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_WEEK,
  SETTINGS_KEYS.MARKETING_MIN_CAMPAIGN_GAP_HOURS,
  SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_MINUTE,
  SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_HOUR,
  SETTINGS_KEYS.MARKETING_MAX_RETRIES,
  SETTINGS_KEYS.MARKETING_ATTRIBUTION_WINDOW_DAYS,
  SETTINGS_KEYS.MARKETING_RFM_PERIOD_DAYS,
  SETTINGS_KEYS.MARKETING_ENGAGEMENT_SCORE_WEIGHTS,
];

export async function getMarketingSettings(): Promise<MarketingSettings> {
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: KEYS } } });
  const value = (key: string, fallback: number) => {
    const row = rows.find((r) => r.key === key);
    const parsed = row ? Number.parseInt(row.value, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  let weights = { recency: 25, frequency: 25, monetary: 25, engagement: 25 };
  const weightsRow = rows.find((r) => r.key === SETTINGS_KEYS.MARKETING_ENGAGEMENT_SCORE_WEIGHTS);
  if (weightsRow) {
    try {
      weights = JSON.parse(weightsRow.value);
    } catch {
      // keep default
    }
  }

  return {
    maxMessagesPerCustomerPerDay: value(SETTINGS_KEYS.MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_DAY, 1),
    maxMessagesPerCustomerPerWeek: value(SETTINGS_KEYS.MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_WEEK, 2),
    minCampaignGapHours: value(SETTINGS_KEYS.MARKETING_MIN_CAMPAIGN_GAP_HOURS, 48),
    rateLimitPerMinute: value(SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_MINUTE, 20),
    rateLimitPerHour: value(SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_HOUR, 200),
    maxRetries: value(SETTINGS_KEYS.MARKETING_MAX_RETRIES, 3),
    attributionWindowDays: value(SETTINGS_KEYS.MARKETING_ATTRIBUTION_WINDOW_DAYS, 7),
    rfmPeriodDays: value(SETTINGS_KEYS.MARKETING_RFM_PERIOD_DAYS, 365),
    engagementScoreWeights: weights,
  };
}

export async function updateMarketingSettings(input: MarketingSettings, userId: string): Promise<void> {
  const updates: { key: string; value: string }[] = [
    { key: SETTINGS_KEYS.MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_DAY, value: String(input.maxMessagesPerCustomerPerDay) },
    { key: SETTINGS_KEYS.MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_WEEK, value: String(input.maxMessagesPerCustomerPerWeek) },
    { key: SETTINGS_KEYS.MARKETING_MIN_CAMPAIGN_GAP_HOURS, value: String(input.minCampaignGapHours) },
    { key: SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_MINUTE, value: String(input.rateLimitPerMinute) },
    { key: SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_HOUR, value: String(input.rateLimitPerHour) },
    { key: SETTINGS_KEYS.MARKETING_MAX_RETRIES, value: String(input.maxRetries) },
    { key: SETTINGS_KEYS.MARKETING_ATTRIBUTION_WINDOW_DAYS, value: String(input.attributionWindowDays) },
    { key: SETTINGS_KEYS.MARKETING_RFM_PERIOD_DAYS, value: String(input.rfmPeriodDays) },
    { key: SETTINGS_KEYS.MARKETING_ENGAGEMENT_SCORE_WEIGHTS, value: JSON.stringify(input.engagementScoreWeights) },
  ];

  for (const update of updates) {
    await prisma.systemSetting.upsert({
      where: { key: update.key },
      update: { value: update.value, updatedById: userId },
      create: { key: update.key, value: update.value, updatedById: userId },
    });
  }

  await writeAuditLog({ userId, action: "SETTINGS_CHANGED", entity: "SystemSetting", metadata: { module: "marketing" } });
}
