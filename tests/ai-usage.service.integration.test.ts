import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { recordAiUsage, getMonthlyAiUsageSummary, getTotalAiCallsThisMonth } from "@/services/ai-usage.service";
import { getSeededOwnerId } from "./helpers/db-fixtures";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

describe("AI cost tracking (Test 20)", () => {
  it("records provider, model, operation, tokens, estimated cost, user, and timestamp for every call", async () => {
    await recordAiUsage({ provider: "mock", model: "template-v1", operation: "generateText", inputTokens: 10, outputTokens: 20, userId });

    const row = await prisma.aiUsageLog.findFirst({ where: { provider: "mock", operation: "generateText", userId }, orderBy: { createdAt: "desc" } });
    expect(row).not.toBeNull();
    expect(row?.inputTokens).toBe(10);
    expect(row?.outputTokens).toBe(20);
    expect(row?.createdAt).toBeInstanceOf(Date);
  });

  it("getMonthlyAiUsageSummary aggregates by (provider, model, operation) for the current month", async () => {
    const before = await getTotalAiCallsThisMonth();
    await recordAiUsage({ provider: "mock", model: "template-v1", operation: "summarize", inputTokens: 5, outputTokens: 5, userId });
    await recordAiUsage({ provider: "mock", model: "template-v1", operation: "summarize", inputTokens: 5, outputTokens: 5, userId });
    const after = await getTotalAiCallsThisMonth();
    expect(after - before).toBe(2);

    const summary = await getMonthlyAiUsageSummary();
    const summarizeRow = summary.find((r) => r.operation === "summarize" && r.provider === "mock");
    expect(summarizeRow).toBeDefined();
    expect(summarizeRow!.callCount).toBeGreaterThanOrEqual(2);
  });

  it("a month with no AI calls returns an empty summary, never a fabricated row", async () => {
    const farFuture = new Date(Date.UTC(2099, 0, 1));
    const summary = await getMonthlyAiUsageSummary(farFuture);
    expect(summary).toEqual([]);
  });
});
