"use server";

import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { askAiAssistantSchema } from "@/lib/validation/marketing";
import { askAiAssistant, type AiAssistantAnswer } from "@/services/ai-assistant.service";
import type { ActionResult } from "@/lib/actions/action-result";

export async function askAiAssistantAction(input: unknown): Promise<ActionResult<AiAssistantAnswer>> {
  let user;
  try {
    user = await requireUser();
    await assertPermission(user, PERMISSIONS.MARKETING_AI_ASSISTANT_USE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = askAiAssistantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ask a question." };

  const answer = await askAiAssistant(parsed.data.question, user, { customerId: parsed.data.customerId });
  return { ok: true, data: answer };
}
