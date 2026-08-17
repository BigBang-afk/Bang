"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { notificationPreferencesSchema } from "@/lib/validation/business-intelligence";
import { setNotificationPreferences } from "@/services/notification-preferences.service";
import type { ActionResult } from "@/lib/actions/action-result";

/** Every user manages their own notification preferences — no separate permission gate, mirroring how any authenticated user manages their own account settings. */
export async function updateNotificationPreferencesAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const user = await requireUser();

  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid preferences." };

  await setNotificationPreferences(user.id, parsed.data);
  revalidatePath("/business-intelligence/settings");
  return { ok: true, data: { ok: true } };
}
