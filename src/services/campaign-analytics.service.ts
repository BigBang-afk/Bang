import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { SETTINGS_KEYS } from "@/lib/settings-keys";

/**
 * Campaign analytics and attribution — see MARKETING-ANALYTICS.md and
 * CAMPAIGN-SYSTEM.md "Attribution". Every rate is computed from the
 * campaign's own CampaignMessage rows; nothing here claims a sale was
 * caused by a campaign unless the attribution model (below) actually
 * supports it. DIRECT and ASSISTED are always reported as two separate,
 * clearly labeled numbers — never combined into a single inflated
 * "campaign revenue" figure.
 */

export async function getAttributionWindowDays(): Promise<number> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SETTINGS_KEYS.MARKETING_ATTRIBUTION_WINDOW_DAYS } });
  const parsed = row ? Number.parseInt(row.value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

function percent(numerator: number, denominator: number): string {
  if (denominator === 0) return "0";
  return ((numerator / denominator) * 100).toFixed(1);
}

export type CampaignAnalytics = {
  campaignId: string;
  audience: number;
  queued: number;
  sentTotal: number;
  delivered: number;
  read: number;
  failed: number;
  optedOut: number;
  cancelled: number;
  replies: number;
  deliveryRate: string;
  readRate: string;
  replyRate: string;
};

export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  const [statusCounts, replies] = await Promise.all([
    prisma.campaignMessage.groupBy({ by: ["status"], where: { campaignId }, _count: true }),
    prisma.campaignMessage.count({ where: { campaignId, repliedAt: { not: null } } }),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count])) as Record<string, number>;
  const audience = statusCounts.reduce((sum, s) => sum + s._count, 0);
  const delivered = byStatus.DELIVERED ?? 0;
  const read = byStatus.READ ?? 0;
  // Every message that successfully left the queue currently sits in SENT, or has since progressed to DELIVERED/READ.
  const sentTotal = (byStatus.SENT ?? 0) + delivered + read;

  return {
    campaignId,
    audience,
    queued: byStatus.QUEUED ?? 0,
    sentTotal,
    delivered,
    read,
    failed: byStatus.FAILED ?? 0,
    optedOut: byStatus.OPTED_OUT ?? 0,
    cancelled: byStatus.CANCELLED ?? 0,
    replies,
    deliveryRate: percent(delivered + read, sentTotal),
    readRate: percent(read, delivered + read),
    replyRate: percent(replies, sentTotal),
  };
}

export type CampaignAttribution = {
  campaignId: string;
  attributionWindowDays: number;
  direct: { orderCount: number; revenue: string };
  assisted: { orderCount: number; revenue: string };
  averageOrderValue: string;
  conversionRate: string;
};

/**
 * A purchase is attributed to this campaign only if the customer received
 * a SENT (or later) message from it and then purchased within the
 * configured attribution window. DIRECT means no other campaign also
 * touched that customer between the message and the sale; ASSISTED means
 * another campaign did too — see CAMPAIGN-SYSTEM.md "Attribution" for the
 * worked example this mirrors exactly.
 */
export async function getCampaignAttribution(campaignId: string): Promise<CampaignAttribution> {
  const windowDays = await getAttributionWindowDays();
  const messages = await prisma.campaignMessage.findMany({
    where: { campaignId, sentAt: { not: null } },
    select: { customerId: true, sentAt: true },
  });

  let directCount = 0;
  let assistedCount = 0;
  let directRevenue = new Prisma.Decimal(0);
  let assistedRevenue = new Prisma.Decimal(0);

  for (const message of messages) {
    const sentAt = message.sentAt as Date;
    const windowEnd = new Date(sentAt.getTime() + windowDays * 24 * 60 * 60 * 1000);

    const sale = await prisma.sale.findFirst({
      where: { customerId: message.customerId, status: { not: "RETURNED" }, saleDate: { gte: sentAt, lte: windowEnd } },
      orderBy: { saleDate: "asc" },
      select: { grandTotal: true, saleDate: true },
    });
    if (!sale) continue;

    const otherCampaignTouches = await prisma.campaignMessage.count({
      where: { customerId: message.customerId, campaignId: { not: campaignId }, sentAt: { gte: sentAt, lte: sale.saleDate } },
    });

    if (otherCampaignTouches === 0) {
      directCount += 1;
      directRevenue = directRevenue.add(sale.grandTotal);
    } else {
      assistedCount += 1;
      assistedRevenue = assistedRevenue.add(sale.grandTotal);
    }
  }

  const totalOrders = directCount + assistedCount;
  const totalRevenue = directRevenue.add(assistedRevenue);

  return {
    campaignId,
    attributionWindowDays: windowDays,
    direct: { orderCount: directCount, revenue: directRevenue.toString() },
    assisted: { orderCount: assistedCount, revenue: assistedRevenue.toString() },
    averageOrderValue: totalOrders > 0 ? totalRevenue.div(totalOrders).toDecimalPlaces(2).toString() : "0",
    conversionRate: percent(totalOrders, messages.length),
  };
}
