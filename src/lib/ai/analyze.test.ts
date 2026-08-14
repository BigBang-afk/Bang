import { beforeEach, describe, expect, it, vi } from "vitest";

import { _clearAnalysisCacheForTests, runAnalysis, type RunAnalysisDeps } from "@/lib/ai/analyze";
import { AIAnalysisError } from "@/lib/ai/schema";
import type { AIAnalysisOutput } from "@/lib/ai/schema";
import type { AnalysisInputSnapshot } from "@/lib/ai/types";
import type { MarketAssetRow } from "@/types/database";

function makeAsset(overrides: Partial<MarketAssetRow> = {}): MarketAssetRow {
  return {
    id: "asset-1",
    symbol: "BTCUSD",
    display_name: "Bitcoin",
    market_type: "crypto",
    base_currency: "BTC",
    quote_currency: "USD",
    exchange: "binance.us",
    is_active: true,
    metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<AnalysisInputSnapshot> = {}): AnalysisInputSnapshot {
  return {
    symbol: "BTCUSD",
    displayName: "Bitcoin",
    marketType: "crypto",
    timeframe: "1h",
    asOfCandleTime: "2026-01-01T00:00:00.000Z",
    price: 50000,
    change24hPercent: 1.5,
    marketStatus: "open",
    recentCandles: [],
    indicators: {
      emaFast: 50000,
      emaSlow: 49000,
      rsi: 60,
      macdHistogram: 10,
      atr: 500,
      atrPercent: 1,
      bollingerUpper: 51000,
      bollingerMiddle: 50000,
      bollingerLower: 49000,
      adx: 30,
      plusDI: 25,
      minusDI: 15,
      relativeVolume: 1.2,
      momentum: 2,
    },
    trend: "bullish",
    momentum: "bullish",
    volatility: "normal",
    volumeState: "above_average",
    technicalScore: 75,
    setupType: "Trend continuation (bullish)",
    supportingConditions: ["Trend confirmed: ADX 30.0 >= 25 (bullish)"],
    conflictingConditions: [],
    supportResistanceLevels: [],
    ...overrides,
  };
}

function makeOutput(overrides: Partial<AIAnalysisOutput> = {}): AIAnalysisOutput {
  return {
    market_bias: "bullish",
    trend: "bullish",
    momentum: "bullish",
    volatility: "normal",
    key_levels: [{ type: "support", price: 49000, label: "Recent swing low" }],
    bullish_factors: ["RSI at 60, above the 50 midline"],
    bearish_factors: [],
    invalidation_conditions: ["A close below 49000 would invalidate this read."],
    setup_quality: "good",
    confidence_score: 72,
    explanation: "Price is trending up with confirming momentum and volume.",
    risk_notes: "Volatility is normal; size positions accordingly.",
    ...overrides,
  };
}

function makeDeps(overrides: Partial<RunAnalysisDeps> = {}): RunAnalysisDeps {
  return {
    buildSnapshot: vi.fn(async () => makeSnapshot()),
    generate: vi.fn(async () => ({ output: makeOutput(), model: "claude-opus-5", tokensUsed: 1200 })),
    persistSuccess: vi.fn(async () => ({ id: "row-1", createdAt: "2026-01-01T00:05:00.000Z" })),
    persistFailure: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("runAnalysis", () => {
  beforeEach(() => {
    _clearAnalysisCacheForTests();
  });

  it("returns a successful analysis and persists it", async () => {
    const deps = makeDeps();
    const asset = makeAsset();

    const result = await runAnalysis({ userId: "user-1", asset, timeframe: "1h" }, deps);

    expect(result.output.market_bias).toBe("bullish");
    expect(result.cached).toBe(false);
    expect(result.model).toBe("claude-opus-5");
    expect(deps.buildSnapshot).toHaveBeenCalledTimes(1);
    expect(deps.generate).toHaveBeenCalledTimes(1);
    expect(deps.persistSuccess).toHaveBeenCalledTimes(1);
    expect(deps.persistFailure).not.toHaveBeenCalled();
  });

  it("serves a repeat request for the same asset/timeframe from cache without calling Claude again", async () => {
    const deps = makeDeps();
    const asset = makeAsset();

    const first = await runAnalysis({ userId: "user-1", asset, timeframe: "1h" }, deps);
    const second = await runAnalysis({ userId: "user-2", asset, timeframe: "1h" }, deps);

    expect(deps.generate).toHaveBeenCalledTimes(1); // not called again on the cache hit
    expect(deps.persistSuccess).toHaveBeenCalledTimes(2); // still logged per-request for auditability
    expect(second.cached).toBe(true);
    expect(second.tokensUsed).toBe(0);
    expect(second.output).toEqual(first.output);
  });

  it("propagates an unsupported-market error and logs the failed attempt", async () => {
    const deps = makeDeps({
      buildSnapshot: vi.fn(async () => {
        throw new AIAnalysisError("unsupported_market", "No connected data source covers XAUUSD.");
      }),
    });

    await expect(
      runAnalysis({ userId: "user-1", asset: makeAsset({ symbol: "XAUUSD" }), timeframe: "1h" }, deps)
    ).rejects.toMatchObject({ code: "unsupported_market" });

    expect(deps.persistFailure).toHaveBeenCalledTimes(1);
    expect(deps.persistFailure).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: expect.stringContaining("unsupported_market") })
    );
    expect(deps.persistSuccess).not.toHaveBeenCalled();
  });

  it("propagates a timeout error and logs the failed attempt", async () => {
    const deps = makeDeps({
      generate: vi.fn(async () => {
        throw new AIAnalysisError("timeout", "The AI analysis request timed out.");
      }),
    });

    await expect(runAnalysis({ userId: "user-1", asset: makeAsset(), timeframe: "1h" }, deps)).rejects.toMatchObject({
      code: "timeout",
    });

    expect(deps.persistFailure).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: expect.stringContaining("timeout") })
    );
  });

  it("propagates an upstream API failure and logs the failed attempt", async () => {
    const deps = makeDeps({
      generate: vi.fn(async () => {
        throw new AIAnalysisError("api_error", "AI provider error: 529 overloaded_error");
      }),
    });

    await expect(runAnalysis({ userId: "user-1", asset: makeAsset(), timeframe: "1h" }, deps)).rejects.toMatchObject({
      code: "api_error",
    });

    expect(deps.persistFailure).toHaveBeenCalledTimes(1);
  });

  it("propagates a malformed-output error and logs the failed attempt", async () => {
    const deps = makeDeps({
      generate: vi.fn(async () => {
        throw new AIAnalysisError(
          "invalid_output",
          "AI output failed validation: confidence_score must be <= 100"
        );
      }),
    });

    await expect(runAnalysis({ userId: "user-1", asset: makeAsset(), timeframe: "1h" }, deps)).rejects.toMatchObject({
      code: "invalid_output",
    });

    expect(deps.persistFailure).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: expect.stringContaining("invalid_output") })
    );
  });
});
