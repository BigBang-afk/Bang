"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { pagesContentSchema } from "@/lib/validations/settings";

export interface ActionState {
  error?: string;
  success?: string;
}

export async function updatePagesContentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("settings.content");

  const parsed = pagesContentSchema.safeParse({
    about_content: formData.get("about_content"),
    privacy_policy: formData.get("privacy_policy"),
    terms_conditions: formData.get("terms_conditions"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid content." };

  const db = createAdminClient();
  const { error } = await db.from("website_settings").update({ ...parsed.data, updated_by: admin.id }).eq("id", true);
  if (error) return { error: `Failed to save: ${error.message}` };

  await recordAdminAction(admin, "pages_content_updated", "website_settings", null);
  revalidatePath("/admin/pages");
  revalidatePath("/about");
  revalidatePath("/privacy-policy");
  revalidatePath("/terms");

  return { success: "Page content saved." };
}
