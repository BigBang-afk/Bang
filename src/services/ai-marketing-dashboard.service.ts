import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getSegmentCounts, getSegmentationConfig } from "@/services/customer-analytics.service";
import { getCustomersToContact } from "@/services/follow-up.service";
import { getCustomerMarketingProfiles, computeAiSegments } from "@/services/ai-segmentation.service";
import { getAttributionWindowDays } from "@/services/campaign-analytics.service";

/**
 * The AI Dashboard's top cards and AI Insights — see AI-MARKETING.md "AI
 * Dashboard". Every number and every insight sentence is a live query
 * result; nothing is a fixed/example string. See `getAiInsights()`'s
 * doc comment for exactly which real query backs each sentence.
 */

export type AiMarketingDashboardSummary = {
  totalCustomers: number;
  vipCustomers: number;
  inactiveCustomers: number;
  readyForFollowUp: number;
  campaignsActive: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  responses: number;
  conversions: number;
};

async function countConversions(): Promise<number> {
  const windowDays = await getAttributionWindowDays();
  const messages = await prisma.campaignMessage.findMany({
    where: { sentAt: { not: null } },
    select: { customerId: true, sentAt: true },
    distinct: ["customerId"],
  });

  let converted = 0;
  for (const message of messages) {
    const windowEnd = new Date((message.sentAt as Date).getTime() + windowDays * 24 * 60 * 60 * 1000);
    const sale = await prisma.sale.findFirst({
      where: { customerId: message.customerId, status: { not: "RETURNED" }, saleDate: { gte: message.sentAt as Date, lte: windowEnd } },
      select: { id: true },
    });
    if (sale) converted += 1;
  }
  return converted;
}

export async function getAiMarketingDashboardSummary(): Promise<AiMarketingDashboardSummary> {
  const [segmentCounts, contactList, activeCampaigns, totalCustomers, sent, delivered, read, responses, conversions] = await Promise.all([
    getSegmentCounts(),
    getCustomersToContact(1000),
    prisma.campaign.count({ where: { status: "RUNNING" } }),
    prisma.customer.count(),
    prisma.campaignMessage.count({ where: { status: { in: ["SENT", "DELIVERED", "READ"] } } }),
    prisma.campaignMessage.count({ where: { status: { in: ["DELIVERED", "READ"] } } }),
    prisma.campaignMessage.count({ where: { status: "READ" } }),
    prisma.campaignMessage.count({ where: { repliedAt: { not: null } } }),
    countConversions(),
  ]);

  return {
    totalCustomers,
    vipCustomers: segmentCounts.VIP,
    inactiveCustomers: segmentCounts.INACTIVE,
    readyForFollowUp: contactList.length,
    campaignsActive: activeCampaigns,
    messagesSent: sent,
    messagesDelivered: delivered,
    messagesRead: read,
    responses,
    conversions,
  };
}

export type AiInsight = { text: string };

/**
 * Each insight is one live query result formatted into a sentence — never
 * a canned example. See the inline comment on each for its exact source:
 *
 * 1. Inactive customers, using the same configurable inactivity threshold
 *    every other Inactive Customers view in the app uses.
 * 2. Customers who are BOTH VIP and BRIDAL_INTEREST (see
 *    ai-segmentation.service.ts) — a literal intersection of two real,
 *    factual segments.
 * 3. Customers with a completed gold (non-silver) purchase in the same
 *    30-day window exactly one year ago.
 * 4. Customers with a positive outstanding balance — the same figure
 *    CUSTOMER-LEDGER.md's receivable tracking already uses.
 */
export async function getAiInsights(): Promise<AiInsight[]> {
  const [config, profiles] = await Promise.all([getSegmentationConfig(), getCustomerMarketingProfiles()]);
  const now = new Date();

  const inactiveCount = profiles.filter((p) => computeAiSegments(p, config, now).includes("INACTIVE")).length;

  const vipBridalCount = profiles.filter((p) => {
    const segments = computeAiSegments(p, config, now);
    return segments.includes("VIP") && segments.includes("BRIDAL_INTEREST");
  }).length;

  const periodStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() - 30);
  const periodEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const samePeriodLastYear = await prisma.sale.findMany({
    where: {
      saleDate: { gte: periodStart, lte: periodEnd },
      status: { not: "RETURNED" },
      customerId: { not: null },
      items: { some: { purity: { not: "SILVER" } } },
    },
    select: { customerId: true },
    distinct: ["customerId"],
  });

  const creditCustomersCount = profiles.filter((p) => Number(p.outstandingBalance) > 0).length;

  const insights: AiInsight[] = [
    { text: `${inactiveCount} customers have not purchased in ${config.inactivityDays}+ days.` },
    { text: `${vipBridalCount} VIP customers have purchased bridal jewelry previously.` },
    { text: `${samePeriodLastYear.length} customers purchased gold jewelry around this period last year.` },
    { text: `${creditCustomersCount} customers have outstanding balances and should not receive promotional credit offers.` },
  ];

  return insights.filter((i) => !i.text.startsWith("0 "));
}
