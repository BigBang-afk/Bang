import "server-only";

import Anthropic, { APIConnectionTimeoutError, APIError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { AI_ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from "@/lib/ai/prompt";
import { AIAnalysisError, AIAnalysisOutputSchema, parseAnalysisOutput } from "@/lib/ai/schema";
import type { AIAnalysisOutput } from "@/lib/ai/schema";
import type { AnalysisInputSnapshot } from "@/lib/ai/types";

/**
 * Model choice is a single named constant, not scattered through the
 * module, so it's a one-line change if it ever needs to move. Kept on
 * Claude Opus 5 for analysis quality; `effort: "medium"` below is the cost
 * control lever for this bounded, structured-output task rather than
 * dropping to a smaller model.
 */
export const AI_ANALYSIS_MODEL = "claude-opus-5";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_TOKENS = 2048;

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AIAnalysisError(
      "api_error",
      "AI analysis is not configured (ANTHROPIC_API_KEY is unset)."
    );
  }
  cachedClient = new Anthropic({ timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  return cachedClient;
}

export interface GenerateAnalysisResult {
  output: AIAnalysisOutput;
  model: string;
  tokensUsed: number;
}

/**
 * The only place this app calls the Claude API for market analysis. Never
 * imported by client components — this file is server-only, and the API
 * key never leaves the server process.
 */
export async function generateAnalysis(
  snapshot: AnalysisInputSnapshot
): Promise<GenerateAnalysisResult> {
  const client = getClient();

  let response;
  try {
    response = await client.messages.parse({
      model: AI_ANALYSIS_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: AI_ANALYSIS_SYSTEM_PROMPT,
      output_config: {
        effort: "medium",
        format: zodOutputFormat(AIAnalysisOutputSchema),
      },
      messages: [{ role: "user", content: buildAnalysisUserPrompt(snapshot) }],
    });
  } catch (err) {
    if (err instanceof APIConnectionTimeoutError) {
      throw new AIAnalysisError("timeout", "The AI analysis request timed out.");
    }
    if (err instanceof APIError) {
      throw new AIAnalysisError("api_error", `AI provider error: ${err.message}`);
    }
    if (err instanceof AIAnalysisError) throw err;
    throw new AIAnalysisError(
      "api_error",
      err instanceof Error ? err.message : "Unknown AI provider error."
    );
  }

  if (response.stop_reason === "refusal") {
    throw new AIAnalysisError("refused", "The AI declined to analyze this request.");
  }

  if (response.parsed_output === null) {
    throw new AIAnalysisError(
      "invalid_output",
      `AI response did not match the expected schema (stop_reason: ${response.stop_reason ?? "unknown"}).`
    );
  }

  // Defensive second validation, through the exact same code path a
  // mocked/tested caller uses — one source of truth for "is this valid",
  // even though structured outputs already enforced the schema server-side.
  const validated = parseAnalysisOutput(response.parsed_output);
  if (!validated.success) {
    throw new AIAnalysisError("invalid_output", `AI output failed validation: ${validated.error}`);
  }

  const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  return { output: validated.data, model: response.model, tokensUsed };
}
