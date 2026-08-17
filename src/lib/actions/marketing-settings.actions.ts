"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { updateMarketingSettingsSchema } from "@/lib/validation/marketing";
import { updateMarketingSettings } from "@/services/marketing-settings.service";
import type { ActionResult } from "@/lib/actions/action-result";

export async function updateMarketingSettingsAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requireUser();
    await assertPermission(user, PERMISSIONS.MARKETING_SETTINGS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = updateMarketingSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };

  const total =
    parsed.data.engagementScoreWeights.recency +
    parsed.data.engagementScoreWeights.frequency +
    parsed.data.engagementScoreWeights.monetary +
    parsed.data.engagementScoreWeights.engagement;
  if (total !== 100) return { ok: false, error: "Engagement score weights must sum to 100." };

  await updateMarketingSettings(parsed.data, user.id);
  revalidatePath("/ai-marketing/settings");
  return { ok: true, data: { ok: true } };
}
