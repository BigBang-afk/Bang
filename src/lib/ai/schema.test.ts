import { describe, expect, it } from "vitest";

import {
  AI_ANALYSIS_ERROR_STATUS,
  type AIAnalysisErrorCode,
  parseAnalysisOutput,
} from "@/lib/ai/schema";

const VALID_OUTPUT = {
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
};

describe("parseAnalysisOutput", () => {
  it("accepts a well-formed analysis object", () => {
    const result = parseAnalysisOutput(VALID_OUTPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.market_bias).toBe("bullish");
      expect(result.data.confidence_score).toBe(72);
    }
  });

  it("rejects output missing a required field", () => {
    const missingConfidence: Record<string, unknown> = { ...VALID_OUTPUT };
    delete missingConfidence.confidence_score;
    const result = parseAnalysisOutput(missingConfidence);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid enum value (hallucinated bias label)", () => {
    const result = parseAnalysisOutput({ ...VALID_OUTPUT, market_bias: "very bullish" });
    expect(result.success).toBe(false);
  });

  it("rejects a confidence_score outside 0-100", () => {
    const result = parseAnalysisOutput({ ...VALID_OUTPUT, confidence_score: 150 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer confidence_score", () => {
    const result = parseAnalysisOutput({ ...VALID_OUTPUT, confidence_score: 50.5 });
    expect(result.success).toBe(false);
  });

  it("rejects malformed key_levels (wrong shape entirely)", () => {
    const result = parseAnalysisOutput({ ...VALID_OUTPUT, key_levels: "support at 49000" });
    expect(result.success).toBe(false);
  });

  it("rejects a raw string response (model ignored the JSON-only instruction)", () => {
    const result = parseAnalysisOutput("Bitcoin looks bullish right now.");
    expect(result.success).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(parseAnalysisOutput(null).success).toBe(false);
    expect(parseAnalysisOutput(undefined).success).toBe(false);
  });
});

describe("AI_ANALYSIS_ERROR_STATUS", () => {
  it("maps every error code to an HTTP status", () => {
    const codes: AIAnalysisErrorCode[] = [
      "unsupported_market",
      "insufficient_data",
      "timeout",
      "api_error",
      "refused",
      "invalid_output",
      "limit_reached",
    ];
    for (const code of codes) {
      expect(AI_ANALYSIS_ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });

  it("maps the daily usage limit to 429 Too Many Requests", () => {
    expect(AI_ANALYSIS_ERROR_STATUS.limit_reached).toBe(429);
  });

  it("maps an unsupported/invalid market to a 404", () => {
    expect(AI_ANALYSIS_ERROR_STATUS.unsupported_market).toBe(404);
  });

  it("maps a request timeout to a 504 Gateway Timeout", () => {
    expect(AI_ANALYSIS_ERROR_STATUS.timeout).toBe(504);
  });

  it("maps an upstream API failure to a 502 Bad Gateway", () => {
    expect(AI_ANALYSIS_ERROR_STATUS.api_error).toBe(502);
  });

  it("maps malformed AI output to a 502 Bad Gateway (not a 4xx client error)", () => {
    expect(AI_ANALYSIS_ERROR_STATUS.invalid_output).toBe(502);
  });
});
