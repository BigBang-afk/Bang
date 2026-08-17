"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { biSettingsSchema } from "@/lib/validation/business-intelligence";
import { updateBiSettings } from "@/services/bi-settings.service";
import type { ActionResult } from "@/lib/actions/action-result";

export async function updateBiSettingsAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const user = await requireUser();
  try {
    await assertPermission(user, PERMISSIONS.BI_SETTINGS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = biSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };

  await updateBiSettings(parsed.data, user.id);
  revalidatePath("/business-intelligence/settings");
  return { ok: true, data: { ok: true } };
}
