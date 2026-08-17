import "server-only";
import { getAiProvider } from "@/services/ai/mock-ai-provider";
import { recordAiUsage } from "@/services/ai-usage.service";
import type {
  GenerateTextInput,
  GenerateStructuredOutputInput,
  ClassifyInput,
  SummarizeInput,
} from "@/services/ai/ai-provider";

/**
 * Thin wrappers around `AiProvider` that always log usage — every AI call
 * in the codebase should go through one of these rather than calling
 * `getAiProvider()` directly, so cost tracking (AI-ARCHITECTURE.md "Cost
 * control") can never be accidentally skipped.
 */

export async function callGenerateText(input: GenerateTextInput, userId: string | null) {
  const provider = getAiProvider();
  const result = await provider.generateText(input);
  await recordAiUsage({
    provider: provider.providerName,
    model: provider.model,
    operation: "generateText",
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    userId,
  });
  return result;
}

export async function callGenerateStructuredOutput<T>(input: GenerateStructuredOutputInput<T>, userId: string | null) {
  const provider = getAiProvider();
  const result = await provider.generateStructuredOutput(input);
  await recordAiUsage({
    provider: provider.providerName,
    model: provider.model,
    operation: "generateStructuredOutput",
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    userId,
  });
  return result;
}

export async function callClassify(input: ClassifyInput, userId: string | null) {
  const provider = getAiProvider();
  const result = await provider.classify(input);
  await recordAiUsage({
    provider: provider.providerName,
    model: provider.model,
    operation: "classify",
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    userId,
  });
  return result;
}

export async function callSummarize(input: SummarizeInput, userId: string | null) {
  const provider = getAiProvider();
  const result = await provider.summarize(input);
  await recordAiUsage({
    provider: provider.providerName,
    model: provider.model,
    operation: "summarize",
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    userId,
  });
  return result;
}
