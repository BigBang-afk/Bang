import "server-only";
import type { z } from "zod";

/**
 * The provider-agnostic AI seam — see AI-ARCHITECTURE.md "Provider
 * abstraction". No business logic anywhere in Phase 7 imports a specific
 * AI vendor's SDK directly; everything goes through this interface, so a
 * real provider can be plugged in later (`getAiProvider()` below) without
 * touching a single caller.
 *
 * `facts` on every input is the ONLY data the provider may reference —
 * it is always assembled by the caller from real database rows before the
 * call, and every implementation (including a future real-LLM one) must
 * treat it as the complete, closed set of allowed facts. This is what
 * makes "never invent preferences/purchases/prices/purity" enforceable at
 * the architecture level rather than by hoping a prompt is obeyed.
 */

export type AiFacts = Record<string, string | number | boolean | null | undefined>;

export type GenerateTextInput = {
  /** A short, stable key identifying what kind of text this is, e.g. "campaign_message", "product_caption". Selects the template/behavior — never free-form instructions the provider blindly executes. */
  task: string;
  /** The closed set of real facts the output may reference. */
  facts: AiFacts;
  /** Optional style guidance: tone, language, length. Never a source of new facts. */
  style?: { tone?: string; language?: string; maxLength?: number };
};

export type GenerateTextResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
};

export type GenerateStructuredOutputInput<T> = {
  task: string;
  facts: AiFacts;
  /** Every structured output MUST be validated against a Zod schema before use — see AI-ARCHITECTURE.md "Structured AI output". */
  schema: z.ZodType<T>;
};

export type GenerateStructuredOutputResult<T> = {
  data: T;
  inputTokens: number;
  outputTokens: number;
};

export type ClassifyInput = {
  facts: AiFacts;
  categories: readonly string[];
};

export type ClassifyResult = {
  category: string;
  confidence: number;
  inputTokens: number;
  outputTokens: number;
};

export type SummarizeInput = {
  facts: AiFacts;
  maxSentences?: number;
};

export interface AiProvider {
  readonly providerName: string;
  readonly model: string;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateStructuredOutput<T>(input: GenerateStructuredOutputInput<T>): Promise<GenerateStructuredOutputResult<T>>;
  classify(input: ClassifyInput): Promise<ClassifyResult>;
  summarize(input: SummarizeInput): Promise<GenerateTextResult>;
}
