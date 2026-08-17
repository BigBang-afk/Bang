import "server-only";
import Decimal from "decimal.js";
import { listCampaigns } from "@/services/campaign.service";
import { getCampaignAnalytics, getCampaignAttribution } from "@/services/campaign-analytics.service";

/**
 * Marketing Analytics (BI rollup) — see ANALYTICS.md "Marketing
 * analytics". Purely a composition of Phase 7's own
 * campaign-analytics.service.ts — this file introduces no new marketing
 * data. DIRECT and ASSISTED attribution stay two separate figures
 * throughout, never summed into one "marketing revenue" number that would
 * claim every purchase resulted from marketing — see CAMPAIGN-SYSTEM.md
 * "Attribution".
 */

export type MarketingAnalyticsSummary = {
  campaignCount: number;
  activeCampaigns: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  replies: number;
  directOrders: number;
  directRevenue: string;
  assistedOrders: number;
  assistedRevenue: string;
  deliveryRatePercent: string;
  readRatePercent: string;
  replyRatePercent: string;
};

function percent(numerator: number, denominator: number): string {
  if (denominator === 0) return "0";
  return new Decimal(numerator).div(denominator).mul(100).toDecimalPlaces(1).toString();
}

/** Rolls up every campaign's own getCampaignAnalytics()/getCampaignAttribution() — capped to the 50 most recent campaigns to keep this a bounded, server-side aggregation rather than an unbounded fan-out. */
export async function getMarketingAnalyticsSummary(): Promise<MarketingAnalyticsSummary> {
  const campaigns = await listCampaigns();
  const recent = campaigns.slice(0, 50);

  const [analyticsRows, attributionRows] = await Promise.all([
    Promise.all(recent.map((c) => getCampaignAnalytics(c.id))),
    Promise.all(recent.map((c) => getCampaignAttribution(c.id))),
  ]);

  let messagesSent = 0;
  let messagesDelivered = 0;
  let messagesRead = 0;
  let replies = 0;
  for (const a of analyticsRows) {
    messagesSent += a.sentTotal;
    messagesDelivered += a.delivered;
    messagesRead += a.read;
    replies += a.replies;
  }

  let directOrders = 0;
  let directRevenue = new Decimal(0);
  let assistedOrders = 0;
  let assistedRevenue = new Decimal(0);
  for (const attribution of attributionRows) {
    directOrders += attribution.direct.orderCount;
    directRevenue = directRevenue.add(attribution.direct.revenue);
    assistedOrders += attribution.assisted.orderCount;
    assistedRevenue = assistedRevenue.add(attribution.assisted.revenue);
  }

  return {
    campaignCount: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.status === "RUNNING").length,
    messagesSent,
    messagesDelivered,
    messagesRead,
    replies,
    directOrders,
    directRevenue: directRevenue.toString(),
    assistedOrders,
    assistedRevenue: assistedRevenue.toString(),
    deliveryRatePercent: percent(messagesDelivered + messagesRead, messagesSent),
    readRatePercent: percent(messagesRead, messagesDelivered + messagesRead),
    replyRatePercent: percent(replies, messagesSent),
  };
}
