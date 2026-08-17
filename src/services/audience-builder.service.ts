import "server-only";
import { prisma } from "@/lib/db/prisma";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import {
  getCustomerMarketingProfiles,
  computeAiSegments,
  type CustomerMarketingProfileRow,
} from "@/services/ai-segmentation.service";
import { getSegmentationConfig } from "@/services/customer-analytics.service";
import { getBusinessEngagementScore } from "@/services/customer-scoring.service";

/**
 * The Audience Builder — see CAMPAIGN-SYSTEM.md "Audience builder". Every
 * filter is an AND condition on real customer/purchase-history data.
 * Consent, blocked status, invalid phone numbers, frequency limits, and
 * manual per-campaign exclusions are computed SEPARATELY from the filter
 * match (see `resolveAudience`) so a campaign preview can show "Audience:
 * 127, Eligible: 115, Opted out: 12" rather than one opaque number.
 */

export type AudienceFilters = {
  customerType?: string[];
  vipOnly?: boolean;
  lastPurchaseWithinDays?: number;
  lastPurchaseOlderThanDays?: number;
  minTotalSpending?: number;
  minPurchaseCount?: number;
  categoryIds?: string[];
  purities?: string[];
  city?: string;
  /** Defaults to true — an audience is meaningless for messaging without it, but a preview can still be built with it off to show the full matched count. */
  requireOptedIn?: boolean;
  minEngagementScore?: number;
  /** Restricts the audience to exactly this explicit customer list (still AND-ed with every other filter) — e.g. a manual resend to a hand-picked set. */
  customerIds?: string[];
};

const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
export function isPlausiblePhoneNumber(phone: string): boolean {
  return PHONE_PATTERN.test(phone.replace(/[\s-]/g, ""));
}

/** Pure, testable — every static (non-engagement-score) filter check against one profile row. */
export function matchesStaticFilters(profile: CustomerMarketingProfileRow, filters: AudienceFilters, vipSegment: boolean): boolean {
  if (filters.customerIds && !filters.customerIds.includes(profile.id)) return false;
  if (filters.customerType && filters.customerType.length > 0 && !filters.customerType.includes(profile.customerType)) return false;
  if (filters.vipOnly && !vipSegment) return false;
  if (filters.lastPurchaseWithinDays !== undefined) {
    if (!profile.lastPurchaseAt) return false;
    const days = (Date.now() - profile.lastPurchaseAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days > filters.lastPurchaseWithinDays) return false;
  }
  if (filters.lastPurchaseOlderThanDays !== undefined) {
    const days = profile.lastPurchaseAt
      ? (Date.now() - profile.lastPurchaseAt.getTime()) / (1000 * 60 * 60 * 24)
      : (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days <= filters.lastPurchaseOlderThanDays) return false;
  }
  if (filters.minTotalSpending !== undefined && Number(profile.totalSpending) < filters.minTotalSpending) return false;
  if (filters.minPurchaseCount !== undefined && profile.purchaseCount < filters.minPurchaseCount) return false;
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    if (!filters.categoryIds.some((id) => profile.purchasedCategoryIds.includes(id))) return false;
  }
  if (filters.purities && filters.purities.length > 0) {
    if (!filters.purities.some((p) => profile.purchasedPurities.includes(p))) return false;
  }
  if (filters.city && profile.city !== filters.city) return false;
  if (filters.requireOptedIn !== false && profile.marketingConsent !== "OPTED_IN") return false;
  return true;
}

export type AudienceResolution = {
  filters: AudienceFilters;
  matchedCount: number;
  eligibleCount: number;
  excludedNotOptedIn: number;
  excludedBlocked: number;
  excludedInvalidNumber: number;
  excludedRecentlyContacted: number;
  excludedManually: number;
  eligibleCustomerIds: string[];
};

async function getFrequencyLimits() {
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          SETTINGS_KEYS.MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_DAY,
          SETTINGS_KEYS.MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_WEEK,
          SETTINGS_KEYS.MARKETING_MIN_CAMPAIGN_GAP_HOURS,
        ],
      },
    },
  });
  const get = (key: string, fallback: number) => {
    const row = rows.find((r) => r.key === key);
    const parsed = row ? Number.parseInt(row.value, 10) : NaN;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  return {
    maxPerDay: get(SETTINGS_KEYS.MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_DAY, 1),
    maxPerWeek: get(SETTINGS_KEYS.MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_WEEK, 2),
    minGapHours: get(SETTINGS_KEYS.MARKETING_MIN_CAMPAIGN_GAP_HOURS, 48),
  };
}

/**
 * Runs the full Audience Builder pipeline for a campaign's stored (or a
 * proposed) filter set: filter match -> consent -> blocked -> invalid
 * number -> manual exclusion -> frequency limits. Every eligible customer
 * survives every gate; a customer excluded at an earlier gate is never
 * double-counted at a later one.
 */
export async function resolveAudience(filters: AudienceFilters, campaignId?: string): Promise<AudienceResolution> {
  const [profiles, config, frequency, manualExclusions] = await Promise.all([
    getCustomerMarketingProfiles(),
    getSegmentationConfig(),
    getFrequencyLimits(),
    campaignId
      ? prisma.campaignAudienceExclusion.findMany({ where: { campaignId }, select: { customerId: true } })
      : Promise.resolve([]),
  ]);
  const excludedIds = new Set(manualExclusions.map((e) => e.customerId));

  const now = new Date();
  let matched = profiles.filter((p) => {
    const segments = computeAiSegments(p, config, now);
    return matchesStaticFilters(p, filters, segments.includes("VIP"));
  });

  if (filters.minEngagementScore !== undefined) {
    const scores = await Promise.all(matched.map((p) => getBusinessEngagementScore(p.id)));
    const scoreById = new Map(scores.map((s) => [s.customerId, s.score]));
    matched = matched.filter((p) => (scoreById.get(p.id) ?? 0) >= filters.minEngagementScore!);
  }

  const matchedCount = matched.length;
  let excludedNotOptedIn = 0;
  let excludedBlocked = 0;
  let excludedInvalidNumber = 0;
  let excludedManually = 0;
  let excludedRecentlyContacted = 0;
  const eligibleCustomerIds: string[] = [];

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const gapAgo = new Date(now.getTime() - frequency.minGapHours * 60 * 60 * 1000);

  for (const profile of matched) {
    if (profile.marketingConsent !== "OPTED_IN") {
      excludedNotOptedIn += 1;
      continue;
    }
    if (profile.status === "BLOCKED") {
      excludedBlocked += 1;
      continue;
    }
    if (!isPlausiblePhoneNumber(profile.phone)) {
      excludedInvalidNumber += 1;
      continue;
    }
    if (excludedIds.has(profile.id)) {
      excludedManually += 1;
      continue;
    }

    const [dayCount, weekCount, mostRecent] = await Promise.all([
      prisma.campaignMessage.count({
        where: { customerId: profile.id, createdAt: { gte: dayAgo }, status: { not: "CANCELLED" } },
      }),
      prisma.campaignMessage.count({
        where: { customerId: profile.id, createdAt: { gte: weekAgo }, status: { not: "CANCELLED" } },
      }),
      prisma.campaignMessage.findFirst({
        where: { customerId: profile.id, status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    if (dayCount >= frequency.maxPerDay || weekCount >= frequency.maxPerWeek || (mostRecent && mostRecent.createdAt > gapAgo)) {
      excludedRecentlyContacted += 1;
      continue;
    }

    eligibleCustomerIds.push(profile.id);
  }

  return {
    filters,
    matchedCount,
    eligibleCount: eligibleCustomerIds.length,
    excludedNotOptedIn,
    excludedBlocked,
    excludedInvalidNumber,
    excludedRecentlyContacted,
    excludedManually,
    eligibleCustomerIds,
  };
}
