"use server";

import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { generateMessageSchema } from "@/lib/validation/marketing";
import { generateCampaignMessageTemplate, type GeneratedMessage } from "@/services/message-generator.service";
import type { ActionResult } from "@/lib/actions/action-result";

export async function generateCampaignMessageAction(input: unknown): Promise<ActionResult<GeneratedMessage>> {
  let user;
  try {
    user = await requireUser();
    await assertPermission(user, PERMISSIONS.MARKETING_CAMPAIGNS_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = generateMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  const result = await generateCampaignMessageTemplate(parsed.data, user.id);
  return { ok: true, data: result };
}
