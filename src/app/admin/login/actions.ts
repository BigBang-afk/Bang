"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validations/forms";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity-log";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const redirectTo = String(formData.get("redirectTo") ?? "/admin");

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitKey = `login:${ip}:${parsed.data.email.toLowerCase()}`;
  const rl = checkRateLimit(rateLimitKey, 5, 15 * 60);
  if (!rl.allowed) {
    return { error: `Too many login attempts. Please try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minute(s).` };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    await logActivity({
      userId: null,
      action: "login_failed",
      entityType: "admin_session",
      description: `Failed login attempt for ${parsed.data.email} from ${ip}`,
    });
    return { error: "Invalid email or password." };
  }

  const adminDb = createAdminClient();
  const { data: profile } = await adminDb
    .from("admin_profiles")
    .select("id, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "This account is not registered as an admin. Contact the Super Admin." };
  }
  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "This admin account has been deactivated." };
  }

  await adminDb.from("admin_profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
  await logActivity({ userId: data.user.id, action: "login", entityType: "admin_session", description: `Login from ${ip}` });

  redirect(redirectTo || "/admin");
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logActivity({ userId: user.id, action: "logout", entityType: "admin_session" });
  }
  await supabase.auth.signOut();
  redirect("/admin/login");
}
