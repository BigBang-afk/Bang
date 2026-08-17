import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { userHasPermission, type CurrentUser } from "@/lib/auth/dal";
import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";
import { getSalesReport } from "@/services/financial-reports.service";
import { getReceivableAgingReport, getPayableReport } from "@/services/financial-reports.service";
import { getSegmentCounts, listInactiveCustomers, listVipCustomers } from "@/services/customer-analytics.service";
import { getCustomerProfile as getCustomerProfileRow } from "@/services/customer.service";
import { getInventorySummary } from "@/services/inventory-item.service";
import { getEffectiveRatesForDate } from "@/services/gold-rate.service";
import { getTodayBusinessDate } from "@/lib/business-date";
import { listGoldWithKarigars, listGoldWithSuppliers } from "@/services/gold-ledger.service";
import { listCampaigns } from "@/services/campaign.service";
import { getCampaignAnalytics } from "@/services/campaign-analytics.service";
import { formatCurrency, formatWeight } from "@/lib/format";

/**
 * The internal AI assistant — see AI-ASSISTANT.md. It NEVER hands a
 * question straight to an LLM with the whole database as context. Every
 * answer comes from one of a fixed set of server-side tools, each gated
 * by the SAME RBAC permission the equivalent page already requires — a
 * cashier asking the assistant for owner-level financial data gets
 * exactly the same ACCESS DENIED a cashier trying to open that page
 * would get, because both paths call `userHasPermission()` against the
 * identical permission key. This is "permission-aware data retrieval,"
 * not a prompt-engineering promise.
 */

export type AiToolName =
  | "getSalesSummary"
  | "getCustomerSegments"
  | "getCustomerProfile"
  | "getInventoryAvailability"
  | "getGoldRates"
  | "getGoldPosition"
  | "getCampaignPerformance"
  | "getReceivables"
  | "getPayables";

type ToolDefinition = { permission: PermissionKey; run: (args: Record<string, unknown>) => Promise<unknown> };

async function getTopSellingProductsThisMonth() {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const rows = await prisma.saleItem.groupBy({
    by: ["productName"],
    where: { sale: { saleDate: { gte: start }, status: { not: "RETURNED" } } },
    _sum: { finalPrice: true },
    _count: true,
    orderBy: { _count: { productName: "desc" } },
    take: 5,
  });
  return rows.map((r) => ({ productName: r.productName, unitsSold: r._count, revenue: (r._sum.finalPrice ?? 0).toString() }));
}

const TOOLS: Record<AiToolName, ToolDefinition> = {
  getSalesSummary: {
    permission: PERMISSIONS.ACCOUNTING_REPORTS_VIEW,
    run: async () => {
      const [today, month, topProducts] = await Promise.all([
        getSalesReport("today", undefined),
        getSalesReport("this_month", undefined),
        getTopSellingProductsThisMonth(),
      ]);
      return { today, thisMonth: month, topProducts };
    },
  },
  getCustomerSegments: {
    permission: PERMISSIONS.CUSTOMERS_VIEW,
    run: async () => {
      const [counts, inactive, vip] = await Promise.all([getSegmentCounts(), listInactiveCustomers(20), listVipCustomers(20)]);
      return { counts, inactiveSample: inactive, vipSample: vip };
    },
  },
  getCustomerProfile: {
    permission: PERMISSIONS.CUSTOMERS_VIEW,
    run: async (args) => {
      const customerId = String(args.customerId ?? "");
      if (!customerId) return null;
      return getCustomerProfileRow(customerId);
    },
  },
  getInventoryAvailability: {
    permission: PERMISSIONS.INVENTORY_VIEW,
    run: async () => getInventorySummary(),
  },
  getGoldRates: {
    permission: PERMISSIONS.GOLD_RATE_READ,
    run: async () => getEffectiveRatesForDate(getTodayBusinessDate()),
  },
  getGoldPosition: {
    permission: PERMISSIONS.GOLD_LEDGER_VIEW,
    run: async () => {
      const [karigars, suppliers] = await Promise.all([listGoldWithKarigars(), listGoldWithSuppliers()]);
      return { karigars, suppliers };
    },
  },
  getCampaignPerformance: {
    permission: PERMISSIONS.MARKETING_VIEW,
    run: async () => {
      const campaigns = await listCampaigns();
      const analytics = await Promise.all(campaigns.slice(0, 20).map((c) => getCampaignAnalytics(c.id)));
      return campaigns.slice(0, 20).map((c, i) => ({ id: c.id, name: c.name, status: c.status, analytics: analytics[i] }));
    },
  },
  getReceivables: {
    permission: PERMISSIONS.ACCOUNTING_REPORTS_VIEW,
    run: async () => getReceivableAgingReport(),
  },
  getPayables: {
    permission: PERMISSIONS.ACCOUNTING_REPORTS_VIEW,
    run: async () => getPayableReport(),
  },
};

/** Keyword-based intent routing — deterministic and auditable, never a free-form prompt executed as a command. Order matters: more specific patterns are checked first. */
export function resolveIntent(question: string): AiToolName | null {
  const q = question.toLowerCase();
  if (/(karigar|supplier).*gold|gold.*(karigar|supplier)/.test(q)) return "getGoldPosition";
  if (/gold rate|rate per gram/.test(q)) return "getGoldRates";
  if (/campaign/.test(q)) return "getCampaignPerformance";
  if (/receivable|customers?.*\bowe\b|owed to us/.test(q)) return "getReceivables";
  if (/payable|we owe|owe (suppliers|karigars)/.test(q)) return "getPayables";
  if (/inactive|not purchased|haven'?t purchased|90 days/.test(q)) return "getCustomerSegments";
  if (/top customers|best customers|vip/.test(q)) return "getCustomerSegments";
  if (/sold the most|best[-\s]?sell|top product/.test(q)) return "getSalesSummary";
  if (/sales|sell|revenue/.test(q)) return "getSalesSummary";
  if (/inventory|stock|available/.test(q)) return "getInventoryAvailability";
  return null;
}

export type AiAssistantAnswer = {
  question: string;
  toolUsed: AiToolName | null;
  denied: boolean;
  answer: string;
  data?: unknown;
};

function summarizeAnswer(tool: AiToolName, data: unknown): string {
  switch (tool) {
    case "getSalesSummary": {
      const d = data as { today: { netSales: string }; thisMonth: { netSales: string } };
      return `Today's net sales: ${formatCurrency(d.today.netSales)}. This month's net sales so far: ${formatCurrency(d.thisMonth.netSales)}.`;
    }
    case "getCustomerSegments": {
      const d = data as { counts: Record<string, number> };
      return `VIP customers: ${d.counts.VIP ?? 0}. Inactive customers: ${d.counts.INACTIVE ?? 0}.`;
    }
    case "getGoldRates": {
      const d = data as { purity: string; ratePerGram: unknown }[];
      return d.length > 0 ? d.map((r) => `${r.purity}: ${formatCurrency(r.ratePerGram as never)}/g`).join(", ") : "No gold rate has been entered for today yet.";
    }
    case "getGoldPosition": {
      const d = data as { karigars: { positions: { purity: string; balance: string; status: string }[] }[] };
      const holdings = d.karigars.flatMap((k) => k.positions.filter((p) => p.status === "HOLDS_GOLD"));
      return holdings.length > 0
        ? `Gold with karigars: ${holdings.map((p) => `${formatWeight(p.balance)} (${p.purity})`).join(", ")}.`
        : "No gold is currently held by karigars.";
    }
    case "getCampaignPerformance": {
      const d = data as { name: string; analytics: { deliveryRate: string } }[];
      if (d.length === 0) return "No campaigns have been run yet.";
      const best = [...d].sort((a, b) => Number(b.analytics.deliveryRate) - Number(a.analytics.deliveryRate))[0];
      return `Best-performing campaign by delivery rate: "${best.name}" (${best.analytics.deliveryRate}% delivered).`;
    }
    case "getReceivables": {
      const d = data as { rows: { outstandingBalance: string }[] };
      const total = d.rows.reduce((sum, r) => sum + Number(r.outstandingBalance), 0);
      return `${d.rows.length} customers have an outstanding balance, totaling ${formatCurrency(total)}.`;
    }
    case "getPayables": {
      const d = data as { payable: string }[];
      const total = d.reduce((sum, r) => sum + Number(r.payable), 0);
      return `${d.length} parties are owed money, totaling ${formatCurrency(total)}.`;
    }
    case "getInventoryAvailability": {
      const d = data as { inStock: number };
      return `${d.inStock} items are currently in stock.`;
    }
    case "getCustomerProfile":
      return data ? "Customer profile retrieved." : "Customer not found.";
    default:
      return "Here is the requested information.";
  }
}

/**
 * Answers a staff question using only tools the CURRENT user is
 * authorized for. A question that maps to a tool the user lacks
 * permission for returns an explicit ACCESS DENIED — it never silently
 * falls back to a lower-privilege answer or a generic non-answer that
 * could be mistaken for "no data exists."
 */
export async function askAiAssistant(question: string, user: CurrentUser, args: Record<string, unknown> = {}): Promise<AiAssistantAnswer> {
  const tool = resolveIntent(question);

  if (!tool) {
    await writeAuditLog({ userId: user.id, action: "AI_ASSISTANT_QUERY", entity: "AiAssistant", metadata: { question, toolUsed: null } });
    return {
      question,
      toolUsed: null,
      denied: false,
      answer:
        "I can help with sales, customer segments, inventory, gold rates, gold with karigars/suppliers, campaign performance, receivables, and payables. Try asking about one of those.",
    };
  }

  const definition = TOOLS[tool];
  const allowed = await userHasPermission(user, definition.permission);

  await writeAuditLog({
    userId: user.id,
    action: "AI_ASSISTANT_QUERY",
    entity: "AiAssistant",
    metadata: { question, toolUsed: tool, denied: !allowed },
  });

  if (!allowed) {
    return { question, toolUsed: tool, denied: true, answer: "ACCESS DENIED — you do not have permission to view this information." };
  }

  const data = await definition.run(args);
  return { question, toolUsed: tool, denied: false, answer: summarizeAnswer(tool, data), data };
}
