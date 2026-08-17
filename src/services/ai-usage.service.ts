import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * AI cost/usage tracking — see AI-ARCHITECTURE.md "Cost control". Every
 * `AiProvider` call is logged here by the caller (never by the provider
 * implementation itself, so a future real provider can't silently skip
 * logging). Nothing here throttles spending automatically — a monthly
 * summary is the visibility a human uses to notice a runaway pattern.
 */

/** A nominal per-1K-token rate used only to give the mock provider a non-zero, orderable cost figure — see AI-ARCHITECTURE.md "Cost control" for why this is clearly not a real invoice figure. */
const MOCK_COST_PER_1K_TOKENS = 0; // the template-based mock provider makes no billed API call

export type RecordAiUsageInput = {
  provider: string;
  model: string;
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  userId: string | null;
};

export async function recordAiUsage(input: RecordAiUsageInput): Promise<void> {
  const totalTokens = (input.inputTokens ?? 0) + (input.outputTokens ?? 0);
  const estimatedCost = new Prisma.Decimal(totalTokens).div(1000).mul(MOCK_COST_PER_1K_TOKENS);

  await prisma.aiUsageLog.create({
    data: {
      provider: input.provider,
      model: input.model,
      operation: input.operation,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      estimatedCost,
      userId: input.userId,
    },
  });
}

export type MonthlyAiUsageSummaryRow = {
  provider: string;
  model: string;
  operation: string;
  callCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCost: string;
};

/** Aggregated by (provider, model, operation) for the calendar month containing `month` (defaults to now). */
export async function getMonthlyAiUsageSummary(month: Date = new Date()): Promise<MonthlyAiUsageSummaryRow[]> {
  const start = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const end = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));

  const rows = await prisma.aiUsageLog.groupBy({
    by: ["provider", "model", "operation"],
    where: { createdAt: { gte: start, lt: end } },
    _count: true,
    _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
  });

  return rows
    .map((r) => ({
      provider: r.provider,
      model: r.model,
      operation: r.operation,
      callCount: r._count,
      totalInputTokens: r._sum.inputTokens ?? 0,
      totalOutputTokens: r._sum.outputTokens ?? 0,
      totalEstimatedCost: (r._sum.estimatedCost ?? new Prisma.Decimal(0)).toString(),
    }))
    .sort((a, b) => b.callCount - a.callCount);
}

export async function getTotalAiCallsThisMonth(month: Date = new Date()): Promise<number> {
  const start = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const end = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
  return prisma.aiUsageLog.count({ where: { createdAt: { gte: start, lt: end } } });
}
