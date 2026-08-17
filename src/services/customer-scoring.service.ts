import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import { getSegmentationConfig } from "@/services/customer-analytics.service";

/**
 * RFM analysis and the Business Engagement Score — see CUSTOMER-SCORING.md.
 * Every input is a real, factual purchasing-behavior figure (Recency,
 * Frequency, Monetary value, campaign engagement); nothing here infers a
 * personal characteristic. The score is explicitly labeled a BUSINESS
 * ENGAGEMENT SCORE everywhere it's shown — never presented as a prediction
 * of personality or private characteristics.
 */

export async function getRfmPeriodDays(): Promise<number> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SETTINGS_KEYS.MARKETING_RFM_PERIOD_DAYS } });
  const parsed = row ? Number.parseInt(row.value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 365;
}

export type RfmBand = 1 | 2 | 3 | 4 | 5;

/** Lower days-since-purchase => higher score. A customer with no purchase at all scores 1. */
export function scoreRecency(recencyDays: number | null): RfmBand {
  if (recencyDays === null) return 1;
  if (recencyDays <= 30) return 5;
  if (recencyDays <= 60) return 4;
  if (recencyDays <= 90) return 3;
  if (recencyDays <= 180) return 2;
  return 1;
}

export function scoreFrequency(purchaseCount: number): RfmBand {
  if (purchaseCount >= 10) return 5;
  if (purchaseCount >= 5) return 4;
  if (purchaseCount >= 3) return 3;
  if (purchaseCount >= 1) return 2;
  return 1;
}

/** Scored relative to the configured VIP spending threshold — the same figure CUSTOMER-SEGMENTS.md's VIP rule uses, so "high monetary value" means the same thing everywhere in the app. */
export function scoreMonetary(monetaryValue: Prisma.Decimal, vipThreshold: Prisma.Decimal): RfmBand {
  if (monetaryValue.gte(vipThreshold)) return 5;
  if (monetaryValue.gte(vipThreshold.mul(0.5))) return 4;
  if (monetaryValue.gte(vipThreshold.mul(0.25))) return 3;
  if (monetaryValue.gt(0)) return 2;
  return 1;
}

export type RfmProfile = {
  customerId: string;
  recencyDays: number | null;
  frequency: number;
  monetary: string;
  recencyScore: RfmBand;
  frequencyScore: RfmBand;
  monetaryScore: RfmBand;
  periodDays: number;
};

export async function getRfmProfile(customerId: string): Promise<RfmProfile> {
  const [periodDays, { vipThreshold }] = await Promise.all([getRfmPeriodDays(), getSegmentationConfig()]);
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const sales = await prisma.sale.findMany({
    where: { customerId, status: { not: "RETURNED" }, saleDate: { gte: since } },
    select: { grandTotal: true, saleDate: true },
    orderBy: { saleDate: "desc" },
  });

  const frequency = sales.length;
  const monetary = sales.reduce((sum, s) => sum.add(s.grandTotal), new Prisma.Decimal(0));
  const recencyDays = sales.length > 0 ? Math.floor((Date.now() - sales[0].saleDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return {
    customerId,
    recencyDays,
    frequency,
    monetary: monetary.toString(),
    recencyScore: scoreRecency(recencyDays),
    frequencyScore: scoreFrequency(frequency),
    monetaryScore: scoreMonetary(monetary, vipThreshold),
    periodDays,
  };
}

export type EngagementScoreWeights = { recency: number; frequency: number; monetary: number; engagement: number };

const DEFAULT_WEIGHTS: EngagementScoreWeights = { recency: 25, frequency: 25, monetary: 25, engagement: 25 };

/** Reads the configurable weights; falls back to equal weights if unset or malformed (never throws on bad config data). */
export async function getEngagementScoreWeights(): Promise<EngagementScoreWeights> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SETTINGS_KEYS.MARKETING_ENGAGEMENT_SCORE_WEIGHTS } });
  if (!row) return DEFAULT_WEIGHTS;
  try {
    const parsed = JSON.parse(row.value) as Partial<EngagementScoreWeights>;
    const weights: EngagementScoreWeights = {
      recency: Number(parsed.recency ?? 0),
      frequency: Number(parsed.frequency ?? 0),
      monetary: Number(parsed.monetary ?? 0),
      engagement: Number(parsed.engagement ?? 0),
    };
    const total = weights.recency + weights.frequency + weights.monetary + weights.engagement;
    if (!Number.isFinite(total) || total <= 0) return DEFAULT_WEIGHTS;
    return weights;
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

/**
 * How positively a customer has responded to past campaign messages
 * (DELIVERED/READ vs. total SENT-or-later). A customer with no campaign
 * history yet gets a neutral 50 — silence is not evidence of disengagement.
 */
export async function computeEngagementSubscore(customerId: string): Promise<number> {
  const messages = await prisma.campaignMessage.findMany({
    where: { customerId, status: { in: ["SENT", "DELIVERED", "READ", "FAILED"] } },
    select: { status: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  if (messages.length === 0) return 50;
  const positive = messages.filter((m) => m.status === "DELIVERED" || m.status === "READ").length;
  return Math.round((positive / messages.length) * 100);
}

export type BusinessEngagementScore = {
  label: "BUSINESS ENGAGEMENT SCORE";
  customerId: string;
  score: number;
  recencySubscore: number;
  frequencySubscore: number;
  monetarySubscore: number;
  engagementSubscore: number;
  weights: EngagementScoreWeights;
  rfm: RfmProfile;
};

/**
 * Recency Score + Frequency Score + Monetary Score + Engagement Score,
 * each on a transparent 0-100 scale, combined via the configured weights.
 * This is a BUSINESS ENGAGEMENT SCORE — a purchasing-behavior metric, not
 * a prediction of personality or a private characteristic. See
 * CUSTOMER-SCORING.md.
 */
export async function getBusinessEngagementScore(customerId: string): Promise<BusinessEngagementScore> {
  const [rfm, weights, engagementSubscore] = await Promise.all([
    getRfmProfile(customerId),
    getEngagementScoreWeights(),
    computeEngagementSubscore(customerId),
  ]);

  const recencySubscore = rfm.recencyScore * 20;
  const frequencySubscore = rfm.frequencyScore * 20;
  const monetarySubscore = rfm.monetaryScore * 20;
  const weightTotal = weights.recency + weights.frequency + weights.monetary + weights.engagement;
  const score = Math.round(
    (recencySubscore * weights.recency +
      frequencySubscore * weights.frequency +
      monetarySubscore * weights.monetary +
      engagementSubscore * weights.engagement) /
      weightTotal,
  );

  return {
    label: "BUSINESS ENGAGEMENT SCORE",
    customerId,
    score,
    recencySubscore,
    frequencySubscore,
    monetarySubscore,
    engagementSubscore,
    weights,
    rfm,
  };
}
