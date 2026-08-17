import "server-only";
import { prisma } from "@/lib/db/prisma";
import { callSummarize } from "@/services/ai/ai-call";
import { getCustomerLifetimeValue } from "@/services/customer-analytics.service";

/**
 * AI Customer Summary — see AI-MARKETING.md "AI customer insights". Every
 * fact passed to the AiProvider is read directly from the customer's own
 * Sale/SaleItem history; nothing about preferences, interactions, family,
 * or finances beyond the recorded outstanding balance is ever invented.
 */

export type AiCustomerSummary = { text: string; generatedAt: Date };

export async function getAiCustomerSummary(customerId: string, userId: string | null): Promise<AiCustomerSummary> {
  const [customer, ltv, categoryAgg] = await Promise.all([
    prisma.customer.findUniqueOrThrow({ where: { id: customerId }, select: { createdAt: true, outstandingBalance: true } }),
    getCustomerLifetimeValue(customerId),
    prisma.saleItem.groupBy({
      by: ["purity"],
      where: { sale: { customerId, status: { not: "RETURNED" } } },
      _count: true,
      orderBy: { _count: { purity: "desc" } },
      take: 1,
    }),
  ]);

  const daysSinceLastPurchase = ltv.lastPurchaseAt
    ? Math.floor((Date.now() - ltv.lastPurchaseAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const { text } = await callSummarize(
    {
      facts: {
        purchaseCount: ltv.purchaseCount,
        totalSpending: ltv.purchaseCount > 0 ? Number(ltv.totalSpending).toLocaleString("en-PK") : null,
        periodLabel: "last 12 months of activity",
        topCategory: categoryAgg[0] ? `${categoryAgg[0].purity} purity jewelry` : null,
        daysSinceLastPurchase,
        outstandingBalance: Number(customer.outstandingBalance) > 0 ? Number(customer.outstandingBalance).toLocaleString("en-PK") : null,
        createdAt: customer.createdAt.toISOString().slice(0, 10),
      },
    },
    userId,
  );

  return { text, generatedAt: new Date() };
}
