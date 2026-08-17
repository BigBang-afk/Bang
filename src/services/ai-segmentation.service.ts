import "server-only";
import { prisma } from "@/lib/db/prisma";
import { formatCustomerCode } from "@/lib/customer-code";
import { Prisma } from "@/generated/prisma/client";
import {
  computeCustomerSegments,
  getSegmentationConfig,
  type Segment,
  type SegmentationConfig,
} from "@/services/customer-analytics.service";
import { AI_SEGMENTS, AI_SEGMENT_LABELS, type AiSegmentValue } from "@/types/marketing";

/**
 * Phase 7's AI customer segmentation. Deliberately does NOT replace or
 * duplicate Phase 4's `computeCustomerSegments()` — it composes it. The
 * spec's 11-segment list is Phase 4's existing 7 (renamed at the label
 * layer only — REGULAR_CUSTOMER -> REGULAR) plus 4 new
 * purchasing-behavior segments computed from real SaleItem data:
 * GOLD_BUYER (purchased a non-silver-purity item), DIAMOND_BUYER (paid a
 * diamond charge on a purchased item), BRIDAL_INTEREST (purchased a
 * product whose name/subcategory says "bridal"), REPEAT_CUSTOMER (2+
 * completed purchases). Every one of these is a literal fact read from
 * the database — never an inferred personal characteristic. See
 * AI-MARKETING.md "Segmentation". The segment list/labels themselves live
 * in src/types/marketing.ts (a plain, non-`server-only` module) so client
 * components can import them without pulling this server-only file along.
 */

export { AI_SEGMENTS, AI_SEGMENT_LABELS };
export type AiSegment = AiSegmentValue;

const PHASE4_TO_AI_SEGMENT: Record<Segment, AiSegment> = {
  NEW_CUSTOMER: "NEW_CUSTOMER",
  REGULAR_CUSTOMER: "REGULAR",
  VIP: "VIP",
  HIGH_VALUE: "HIGH_VALUE",
  INACTIVE: "INACTIVE",
  CREDIT_CUSTOMER: "CREDIT_CUSTOMER",
  RECENT_BUYER: "RECENT_BUYER",
};

export type CustomerMarketingProfileRow = {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  city: string | null;
  customerType: string;
  status: string;
  marketingConsent: "OPTED_IN" | "OPTED_OUT" | "UNKNOWN";
  outstandingBalance: string;
  totalSpending: string;
  purchaseCount: number;
  lastPurchaseAt: Date | null;
  createdAt: Date;
  hasGoldPurchase: boolean;
  hasDiamondPurchase: boolean;
  hasBridalPurchase: boolean;
  purchasedCategoryIds: string[];
  purchasedPurities: string[];
};

type RawRow = {
  id: string;
  customerCode: number;
  name: string;
  phone: string;
  city: string | null;
  customerType: string;
  status: string;
  marketingConsent: "OPTED_IN" | "OPTED_OUT" | "UNKNOWN";
  outstandingBalance: Prisma.Decimal;
  createdAt: Date;
  totalSpending: Prisma.Decimal;
  purchaseCount: bigint;
  lastPurchaseAt: Date | null;
  hasGoldPurchase: boolean;
  hasDiamondPurchase: boolean;
  hasBridalPurchase: boolean;
  purchasedCategoryIds: (string | null)[] | null;
  purchasedPurities: (string | null)[] | null;
};

/**
 * One row per customer with everything Audience Building, AI segmentation,
 * and follow-up ranking need — a single aggregate query rather than one
 * query per concern, mirroring customer-analytics.service.ts's own
 * CUSTOMER_STATS_BASE pattern (fine at this shop's customer-count scale).
 */
export async function getCustomerMarketingProfiles(): Promise<CustomerMarketingProfileRow[]> {
  const rows = await prisma.$queryRaw<RawRow[]>(Prisma.sql`
    SELECT
      c.id, c."customerCode", c.name, c.phone, c.city, c."customerType", c.status, c."marketingConsent",
      c."outstandingBalance", c."createdAt",
      COALESCE(SUM(s."grandTotal"), 0) AS "totalSpending",
      COUNT(DISTINCT s.id) AS "purchaseCount",
      MAX(s."saleDate") AS "lastPurchaseAt",
      COALESCE(BOOL_OR(si.purity != 'SILVER'), false) AS "hasGoldPurchase",
      COALESCE(BOOL_OR(si."diamondCharge" > 0), false) AS "hasDiamondPurchase",
      COALESCE(BOOL_OR(si."productName" ILIKE '%bridal%'), false) AS "hasBridalPurchase",
      ARRAY_AGG(DISTINCT p."categoryId") FILTER (WHERE p."categoryId" IS NOT NULL) AS "purchasedCategoryIds",
      ARRAY_AGG(DISTINCT si.purity::text) FILTER (WHERE si.purity IS NOT NULL) AS "purchasedPurities"
    FROM customers c
    LEFT JOIN sales s ON s."customerId" = c.id AND s.status != 'RETURNED'
    LEFT JOIN sale_items si ON si."saleId" = s.id
    LEFT JOIN inventory_items ii ON ii.id = si."inventoryItemId"
    LEFT JOIN products p ON p.id = ii."productId"
    GROUP BY c.id
  `);

  return rows.map((row) => ({
    id: row.id,
    customerCode: formatCustomerCode(row.customerCode),
    name: row.name,
    phone: row.phone,
    city: row.city,
    customerType: row.customerType,
    status: row.status,
    marketingConsent: row.marketingConsent,
    outstandingBalance: row.outstandingBalance.toString(),
    totalSpending: row.totalSpending.toString(),
    purchaseCount: Number(row.purchaseCount),
    lastPurchaseAt: row.lastPurchaseAt,
    createdAt: row.createdAt,
    hasGoldPurchase: row.hasGoldPurchase,
    hasDiamondPurchase: row.hasDiamondPurchase,
    hasBridalPurchase: row.hasBridalPurchase,
    purchasedCategoryIds: (row.purchasedCategoryIds ?? []).filter((v): v is string => v !== null),
    purchasedPurities: (row.purchasedPurities ?? []).filter((v): v is string => v !== null),
  }));
}

export function computeAiSegments(
  profile: Pick<
    CustomerMarketingProfileRow,
    "createdAt" | "lastPurchaseAt" | "totalSpending" | "outstandingBalance" | "purchaseCount" | "hasGoldPurchase" | "hasDiamondPurchase" | "hasBridalPurchase"
  >,
  config: SegmentationConfig,
  now: Date = new Date(),
): AiSegment[] {
  const phase4Segments = computeCustomerSegments(profile, config, now);
  const segments = new Set<AiSegment>(phase4Segments.map((s) => PHASE4_TO_AI_SEGMENT[s]));

  if (profile.hasGoldPurchase) segments.add("GOLD_BUYER");
  if (profile.hasDiamondPurchase) segments.add("DIAMOND_BUYER");
  if (profile.hasBridalPurchase) segments.add("BRIDAL_INTEREST");
  if (profile.purchaseCount >= 2) segments.add("REPEAT_CUSTOMER");

  return [...segments];
}

export async function getAiCustomerSegments(customerId: string): Promise<AiSegment[]> {
  const [profiles, config] = await Promise.all([getCustomerMarketingProfiles(), getSegmentationConfig()]);
  const profile = profiles.find((p) => p.id === customerId);
  if (!profile) return [];
  return computeAiSegments(profile, config);
}

export async function getAiSegmentCounts(): Promise<Record<AiSegment, number>> {
  const [profiles, config] = await Promise.all([getCustomerMarketingProfiles(), getSegmentationConfig()]);
  const counts = Object.fromEntries(AI_SEGMENTS.map((s) => [s, 0])) as Record<AiSegment, number>;
  const now = new Date();
  for (const profile of profiles) {
    for (const segment of computeAiSegments(profile, config, now)) counts[segment] += 1;
  }
  return counts;
}

export async function listCustomersInAiSegment(segment: AiSegment, limit = 200): Promise<CustomerMarketingProfileRow[]> {
  const [profiles, config] = await Promise.all([getCustomerMarketingProfiles(), getSegmentationConfig()]);
  const now = new Date();
  return profiles.filter((p) => computeAiSegments(p, config, now).includes(segment)).slice(0, limit);
}
