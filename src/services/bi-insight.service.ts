import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { getSalesPerformance } from "@/services/bi-dashboard.service";
import { getInventoryAgeBuckets } from "@/services/bi-inventory-analytics.service";
import { getMarketingAnalyticsSummary } from "@/services/bi-marketing-analytics.service";
import { getHistoricalTotalReceivable } from "@/services/historical-balance.service";
import { formatCurrency } from "@/lib/format";

/**
 * AI Business Insights — see BUSINESS-INTELLIGENCE.md "AI insights" /
 * AI-ARCHITECTURE.md "AI insight validation". Every insight's numbers come
 * from an already-validated backend metric (a real service function call)
 * — this file never asks an AI provider to compute or invent a figure; it
 * only assembles the sentence FROM numbers TypeScript itself computed.
 * That is the enforcement mechanism behind the spec's CRITICAL TEST: the
 * AI "explains" 25%, it never independently produces or alters it. See
 * ai-provider.service tests for the equivalent guarantee elsewhere in
 * this codebase (message-generator, ai-assistant).
 */

export type BusinessInsight = {
  metric: string;
  period: string;
  source: string;
  explanation: string;
};

export async function getBusinessInsights(): Promise<BusinessInsight[]> {
  const insights: BusinessInsight[] = [];

  const salesPerformance = await getSalesPerformance();
  if (salesPerformance.monthOverMonth.direction !== "NO_COMPARISON" && salesPerformance.monthOverMonth.growthPercent) {
    const pct = new Decimal(salesPerformance.monthOverMonth.growthPercent).abs().toString();
    const verb = salesPerformance.monthOverMonth.direction === "UP" ? "increased" : salesPerformance.monthOverMonth.direction === "DOWN" ? "decreased" : "stayed flat";
    insights.push({
      metric: "Monthly net sales",
      period: "This month vs. last month",
      source: "profit-loss.service.ts getProfitAndLoss()",
      explanation: `Net sales ${verb} ${pct}% compared with the previous comparable period (${formatCurrency(salesPerformance.thisMonth)} vs. ${formatCurrency(salesPerformance.lastMonth)}).`,
    });
  }

  const ageBuckets = await getInventoryAgeBuckets();
  const agingBucket = ageBuckets.find((b) => b.label === "180+ days");
  if (agingBucket && agingBucket.itemCount > 0) {
    insights.push({
      metric: "Aging inventory (180+ days)",
      period: "As of today",
      source: "bi-inventory-analytics.service.ts getInventoryAgeBuckets()",
      explanation: `Inventory worth ${formatCurrency(agingBucket.costValue)} (recorded cost, ${agingBucket.itemCount} item${agingBucket.itemCount === 1 ? "" : "s"}) has had no recorded sale for more than 180 days.`,
    });
  }

  const marketing = await getMarketingAnalyticsSummary();
  if (new Decimal(marketing.directRevenue).gt(0)) {
    insights.push({
      metric: "Marketing-attributed revenue",
      period: "Across recent campaigns",
      source: "campaign-analytics.service.ts getCampaignAttribution()",
      explanation: `Marketing campaigns directly generated ${formatCurrency(marketing.directRevenue)} in attributed revenue from ${marketing.directOrders} order${marketing.directOrders === 1 ? "" : "s"} (plus ${formatCurrency(marketing.assistedRevenue)} assisted revenue from ${marketing.assistedOrders} order${marketing.assistedOrders === 1 ? "" : "s"}).`,
    });
  }

  const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [receivablesNow, receivablesAtMonthStart] = await Promise.all([
    prisma.customer.aggregate({ _sum: { outstandingBalance: true } }),
    getHistoricalTotalReceivable(startOfMonth),
  ]);
  const currentReceivable = new Decimal(receivablesNow._sum.outstandingBalance ?? 0);
  if (!receivablesAtMonthStart.isZero()) {
    const changePercent = currentReceivable.sub(receivablesAtMonthStart).div(receivablesAtMonthStart).mul(100).toDecimalPlaces(1);
    if (!changePercent.isZero()) {
      insights.push({
        metric: "Customer receivables",
        period: "Since the start of this month",
        source: "historical-balance.service.ts getHistoricalTotalReceivable()",
        explanation: `Customer receivables ${changePercent.gt(0) ? "increased" : "decreased"} ${changePercent.abs().toString()}% since the start of this month (${formatCurrency(receivablesAtMonthStart.toString())} to ${formatCurrency(currentReceivable.toString())}).`,
      });
    }
  }

  return insights;
}

/** Every insight-generation call is audited, even though it computes nothing an AI model produced — see BUSINESS-INTELLIGENCE.md "Audit log". */
export async function getBusinessInsightsAudited(userId: string): Promise<BusinessInsight[]> {
  const insights = await getBusinessInsights();
  await writeAuditLog({ userId, action: "AI_INSIGHT_GENERATED", entity: "BusinessInsight", metadata: { count: insights.length } });
  return insights;
}
