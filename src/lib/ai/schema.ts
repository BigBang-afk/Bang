/**
 * The structured shape every AI market analysis must return. Enforced two
 * ways: server-side via Claude's structured outputs (`output_config.format`,
 * built from this same schema — see client.ts), and again here via
 * `parseAnalysisOutput` as a defensive second check, since structured
 * outputs can still come back empty (a refusal, or a response cut off at
 * `max_tokens`) and callers need a single place that turns "whatever came
 * back" into either a validated result or a typed error.
 *
 * `confidence_score` is documented on the field itself, not just in the
 * prompt: it is a measure of how many independent technical signals agree,
 * not a probability of profit — see AI_ANALYSIS_SYSTEM_PROMPT in prompt.ts
 * for the rule this schema exists to structure the output of.
 */

import { z } from "zod";

export const MarketBiasSchema = z.enum(["bullish", "bearish", "neutral"]);
export const TrendSchema = z.enum(["bullish", "bearish", "neutral"]);
export const MomentumSchema = z.enum(["bullish", "bearish", "neutral"]);
export const VolatilitySchema = z.enum(["low", "normal", "high"]);
export const SetupQualitySchema = z.enum(["poor", "fair", "good", "excellent"]);

export const KeyLevelSchema = z.object({
  type: z.enum(["support", "resistance"]),
  price: z.number(),
  label: z.string().max(80),
});

export const AIAnalysisOutputSchema = z.object({
  market_bias: MarketBiasSchema,
  trend: TrendSchema,
  momentum: MomentumSchema,
  volatility: VolatilitySchema,
  key_levels: z.array(KeyLevelSchema).max(10),
  bullish_factors: z.array(z.string().max(240)).max(8),
  bearish_factors: z.array(z.string().max(240)).max(8),
  invalidation_conditions: z.array(z.string().max(240)).max(6),
  setup_quality: SetupQualitySchema,
  /** 0-100. An analytical agreement score, NOT a probability of profit. */
  confidence_score: z.number().int().min(0).max(100),
  explanation: z.string().max(2000),
  risk_notes: z.string().max(1000),
});

export type AIAnalysisOutput = z.infer<typeof AIAnalysisOutputSchema>;
export type KeyLevel = z.infer<typeof KeyLevelSchema>;

export type AIAnalysisErrorCode =
  | "unsupported_market"
  | "insufficient_data"
  | "timeout"
  /** Covers both a failed upstream market-data call and a failed Claude API call. */
  | "api_error"
  | "refused"
  | "invalid_output"
  | "limit_reached";

export class AIAnalysisError extends Error {
  constructor(
    public readonly code: AIAnalysisErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AIAnalysisError";
  }
}

/**
 * HTTP status each error code maps to at the API route boundary
 * (app/api/ai-analysis/route.ts). Exported as data, not inlined in the
 * route, so the mapping itself is unit-testable without spinning up a
 * Next.js route handler.
 */
export const AI_ANALYSIS_ERROR_STATUS: Record<AIAnalysisErrorCode, number> = {
  unsupported_market: 404,
  insufficient_data: 422,
  timeout: 504,
  api_error: 502,
  refused: 422,
  invalid_output: 502,
  limit_reached: 429,
};

export interface ParsedAnalysisOutput {
  success: true;
  data: AIAnalysisOutput;
}

export interface FailedAnalysisOutput {
  success: false;
  error: string;
}

/**
 * Validates an arbitrary value (parsed JSON from the model, or a raw object
 * in tests) against the output schema. Never throws — callers decide how to
 * react to a validation failure (retry, surface an error, etc).
 */
export function parseAnalysisOutput(
  raw: unknown
): ParsedAnalysisOutput | FailedAnalysisOutput {
  const result = AIAnalysisOutputSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.issues.map((i) => i.message).join("; ") };
}
