import "server-only";
import { SYSTEM_PROMPT, buildLeadContext, type AgentForPrompt, type LeadForPrompt } from "./prompt";
import { aiFollowUpJsonSchema, aiFollowUpSchema, type AIFollowUpResult } from "./schema";
import { findUnsupportedClaims } from "./factCheck";
import { AIError, type AIProvider } from "./providers/types";
import type { MessageKind } from "../constants";

export interface GenerationOutput {
  result: AIFollowUpResult;
  warnings: Record<MessageKind, string[]>;
  provider: string;
}

export async function generateFollowUps(
  provider: AIProvider,
  lead: LeadForPrompt,
  agent: AgentForPrompt,
): Promise<GenerationOutput> {
  const userMessage = buildLeadContext(lead, agent);
  const raw = await provider.generateJSON({
    system: SYSTEM_PROMPT,
    user: userMessage,
    schema: aiFollowUpJsonSchema as unknown as Record<string, unknown>,
  });

  const parsed = aiFollowUpSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[ai] Output failed validation:", parsed.error.issues.map((i) => i.path.join(".")).join(", "));
    throw new AIError("The AI returned an incomplete response. Please try again.");
  }
  const result = parsed.data;

  // Flag facts in each message that the agent never supplied.
  const warnings: Record<MessageKind, string[]> = {
    immediate: findUnsupportedClaims(result.immediate_response, userMessage),
    follow_up_1d: findUnsupportedClaims(result.follow_up_1_day, userMessage),
    follow_up_3d: findUnsupportedClaims(result.follow_up_3_days, userMessage),
  };
  return { result, warnings, provider: provider.name };
}
