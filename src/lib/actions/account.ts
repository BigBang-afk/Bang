"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AuthActionState } from "@/lib/actions/auth";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  changePasswordSchema,
  deleteAccountSchema,
  notificationSettingsSchema,
  resetPasswordSchema,
} from "@/lib/validations/account";

/**
 * Sets a new password for a user who arrived via the password-recovery
 * email link (Supabase already established a session for them at
 * /auth/callback before they reach this action).
 */
export async function resetPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Your reset link expired. Request a new one." };
  }

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    if (error.code === "same_password") {
      return { error: "That's your current password — choose a different one." };
    }
    return { error: "Couldn't update your password. Please try again." };
  }

  redirect("/dashboard");
}

/**
 * Changes the password for an already-authenticated user, from Account
 * Settings. Re-verifies the current password via a fresh sign-in before
 * applying the change, rather than trusting the session alone.
 */
export async function changePasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const profile = await requireUser("/dashboard/settings");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const limit = rateLimit(`change-password:${profile.id}`, 5, 60_000);
  if (!limit.success) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "Couldn't verify your account. Please log in again." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    return { error: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateError) {
    if (updateError.code === "same_password") {
      return { error: "That's your current password — choose a different one." };
    }
    return { error: "Couldn't update your password. Please try again." };
  }

  return { error: null, success: "Password updated." };
}

const deleteConfirmSchema = z.object({
  confirmation: deleteAccountSchema.shape.confirmation,
});

/**
 * Permanently deletes the signed-in user's account. Uses the service-role
 * client (server-only) since deleting an auth.users row requires the Auth
 * Admin API — the profile, subscriptions, watchlists, journal entries etc.
 * all cascade-delete via their foreign keys.
 */
export async function deleteAccountAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const profile = await requireUser("/dashboard/settings");

  const parsed = deleteConfirmSchema.safeParse({
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return { error: 'Type "DELETE" to confirm.' };
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return {
      error: "Account deletion isn't available right now. Contact support.",
    };
  }

  await admin.from("audit_logs").insert({
    actor_id: profile.id,
    actor_role: profile.role,
    action: "account.self_deleted",
    entity_type: "profile",
    entity_id: profile.id,
  });

  const { error } = await admin.auth.admin.deleteUser(profile.id);
  if (error) {
    return { error: "Couldn't delete your account. Please try again or contact support." };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/");
}

export async function updateNotificationSettingsAction(formData: FormData) {
  const profile = await requireUser("/dashboard/settings");

  const parsed = notificationSettingsSchema.safeParse({
    emailNotifications: formData.get("emailNotifications"),
    marketingEmails: formData.get("marketingEmails"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("user_settings")
    .update({
      email_notifications: parsed.data.emailNotifications,
      marketing_emails: parsed.data.marketingEmails,
    })
    .eq("user_id", profile.id);

  revalidatePath("/dashboard/settings");
}
