import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { computeGrowth, getSalesPerformance } from "@/services/bi-dashboard.service";
import { getBusinessInsights, getBusinessInsightsAudited } from "@/services/bi-insight.service";
import { getSeededOwnerId } from "./helpers/db-fixtures";

describe("CRITICAL AI INSIGHT TEST — backend-computed figures are never altered by an AI step", () => {
  it("computeGrowth(1,000,000 vs 800,000) yields exactly the spec's expected 25% growth, UP", () => {
    // Exact figures from the Phase 8 spec: backend provides Sales 1,000,000,
    // Previous 800,000, expected growth 25%. This is the deterministic,
    // pure-function proof that the number 25% comes from arithmetic, not
    // from an AI call — an AI may only ever be handed this already-computed
    // result to phrase in prose, never asked to derive or adjust it.
    const growth = computeGrowth("1000000", "800000");
    expect(growth.direction).toBe("UP");
    expect(growth.growthPercent).toBe("25");
    expect(Number(growth.growthPercent)).toBe(25);
    expect(growth.current).toBe("1000000");
    expect(growth.previous).toBe("800000");
  });

  it("computeGrowth never fabricates a percentage when the previous period is zero", () => {
    const growth = computeGrowth("500000", "0");
    expect(growth.direction).toBe("NO_COMPARISON");
    expect(growth.growthPercent).toBeNull();
  });

  it("bi-insight.service.ts contains no AI provider call anywhere in the insight-computation path", () => {
    // Structural enforcement check: getBusinessInsights() must build every
    // sentence from numbers TypeScript itself computed, never by asking an
    // AI provider to generate or alter a figure. Grepping the source is a
    // stronger guarantee here than mocking, since it proves the code path
    // has no AI call to accidentally take, not just that a particular mock
    // was unused on one run.
    const source = readFileSync(new URL("../src/services/bi-insight.service.ts", import.meta.url), "utf-8");
    expect(source).not.toMatch(/callGenerateText|callSummarize|AiProvider|getAiProvider/);
  });

  it("getBusinessInsights' explanation text embeds the exact real percentage computed by getSalesPerformance, never a different number", async () => {
    const [insights, salesPerformance] = await Promise.all([getBusinessInsights(), getSalesPerformance()]);

    const salesInsight = insights.find((i) => i.metric === "Monthly net sales");
    if (salesPerformance.monthOverMonth.direction === "NO_COMPARISON" || !salesPerformance.monthOverMonth.growthPercent) {
      // With no valid prior-period comparison, no fabricated insight may be emitted.
      expect(salesInsight).toBeUndefined();
      return;
    }

    expect(salesInsight).toBeDefined();
    const expectedPct = Math.abs(Number(salesPerformance.monthOverMonth.growthPercent)).toString();
    expect(salesInsight?.explanation).toContain(`${expectedPct}%`);
    expect(salesInsight?.metric).toBe("Monthly net sales");
    expect(salesInsight?.source).toContain("getProfitAndLoss");
  });

  it("every insight carries Metric/Period/Source/Explanation, per the spec's required shape", async () => {
    const insights = await getBusinessInsights();
    for (const insight of insights) {
      expect(insight.metric.length).toBeGreaterThan(0);
      expect(insight.period.length).toBeGreaterThan(0);
      expect(insight.source.length).toBeGreaterThan(0);
      expect(insight.explanation.length).toBeGreaterThan(0);
    }
  });
});

describe("AI insight generation (Test 27) is audited", () => {
  it("getBusinessInsightsAudited writes an AI_INSIGHT_GENERATED audit log row", async () => {
    const owner = await getSeededOwnerId();
    await getBusinessInsightsAudited(owner);

    const log = await prisma.auditLog.findFirst({
      where: { userId: owner, action: "AI_INSIGHT_GENERATED", entity: "BusinessInsight" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
  });
});
