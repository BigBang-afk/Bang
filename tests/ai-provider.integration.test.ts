import { describe, expect, it, beforeAll } from "vitest";
import { z } from "zod";
import { getAiProvider, MockAiProvider } from "@/services/ai/mock-ai-provider";
import { callGenerateText, callGenerateStructuredOutput, callClassify, callSummarize } from "@/services/ai/ai-call";
import { prisma } from "@/lib/db/prisma";
import { getSeededOwnerId } from "./helpers/db-fixtures";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

describe("AI provider abstraction (Test 17)", () => {
  it("getAiProvider() always returns the same shared instance with a stable name/model", () => {
    const a = getAiProvider();
    const b = getAiProvider();
    expect(a).toBe(b);
    expect(a.providerName).toBe("mock");
    expect(typeof a.model).toBe("string");
  });

  it("generateText only ever references facts it was given — it cannot invent a fact absent from the input", async () => {
    const provider = new MockAiProvider();
    const result = await provider.generateText({ task: "campaign_message", facts: { productName: "Diamond Ring", campaignType: "SPECIAL_OFFER" } });
    expect(result.text).toContain("{{product_name}}");
    // No numeric price/rate was supplied, so none can appear.
    expect(result.text).not.toMatch(/rs\.?\s*\d/i);
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBeGreaterThan(0);
  });

  it("classify picks the category whose name literally appears in the given facts", async () => {
    const provider = new MockAiProvider();
    const result = await provider.classify({ facts: { note: "this customer loves gold jewelry" }, categories: ["gold", "diamond", "silver"] });
    expect(result.category).toBe("gold");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("summarize produces a factual sentence from supplied purchase facts only", async () => {
    const provider = new MockAiProvider();
    const result = await provider.summarize({ facts: { purchaseCount: 3, totalSpending: "900,000", daysSinceLastPurchase: 12 } });
    expect(result.text).toContain("3 purchase");
    expect(result.text).toContain("12 days ago");
  });

  it("every call through the ai-call.ts wrappers is logged to AiUsageLog", async () => {
    const before = await prisma.aiUsageLog.count();
    await callGenerateText({ task: "campaign_message", facts: { campaignType: "SPECIAL_OFFER" } }, userId);
    await callClassify({ facts: { note: "gold" }, categories: ["gold", "silver"] }, userId);
    await callSummarize({ facts: { purchaseCount: 1 } }, userId);
    const after = await prisma.aiUsageLog.count();
    expect(after - before).toBe(3);
  });
});

describe("AI structured output validation (Test 18)", () => {
  const recommendationSchema = z.object({
    customerId: z.uuid(),
    reason: z.string().min(1),
    recommendedAction: z.string().min(1),
    confidence: z.number().min(0).max(1),
  });

  it("validates a well-formed candidate against the schema and returns typed data", async () => {
    const candidate = {
      customerId: "9b616379-79ff-47a8-9ae0-882deb84590a",
      reason: "Customer purchased bridal jewelry 11 months ago and has not purchased since.",
      recommendedAction: "SEND_FOLLOW_UP",
      confidence: 0.8,
    };
    const result = await callGenerateStructuredOutput({ task: "recommendation", facts: { __candidate: JSON.stringify(candidate) }, schema: recommendationSchema }, userId);
    expect(result.data.customerId).toBe(candidate.customerId);
    expect(result.data.confidence).toBe(0.8);
  });

  it("rejects a malformed candidate rather than silently accepting it as application logic", async () => {
    const invalidCandidate = { customerId: "not-a-uuid", reason: "", confidence: 5 };
    await expect(
      callGenerateStructuredOutput({ task: "recommendation", facts: { __candidate: JSON.stringify(invalidCandidate) }, schema: recommendationSchema }, userId),
    ).rejects.toThrow();
  });
});
