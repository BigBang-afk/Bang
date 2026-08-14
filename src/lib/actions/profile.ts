"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/lib/actions/auth";

const updateProfileSchema = z.object({
  fullName: z.string().trim().max(120).optional().or(z.literal("")),
  displayName: z.string().trim().max(60).optional().or(z.literal("")),
  timezone: z.string().trim().max(60).min(1),
});

export async function updateProfileAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const profile = await requireUser("/dashboard/settings");

  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    displayName: formData.get("displayName"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName || null,
      display_name: parsed.data.displayName || null,
      timezone: parsed.data.timezone,
    })
    .eq("id", profile.id);

  if (error) {
    return { error: "Couldn't save your changes. Please try again." };
  }

  revalidatePath("/dashboard/settings");
  return { error: null, success: "Settings saved." };
}
