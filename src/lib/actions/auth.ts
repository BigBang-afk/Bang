"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
} from "@/lib/validations/auth";

export interface AuthActionState {
  error: string | null;
  success?: string | null;
}

async function requestKey(prefix: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${prefix}:${ip}`;
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const limit = rateLimit(await requestKey("login"), 10, 60_000);
  if (!limit.success) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately vague — never reveal whether the email exists.
    return { error: "Invalid email or password." };
  }

  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/dashboard");
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const limit = rateLimit(await requestKey("register"), 5, 60_000);
  if (!limit.success) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const h = await headers();
  const origin = h.get("origin");
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: "We couldn't create your account. Please try again." };
  }

  return {
    error: null,
    success: "Check your inbox to confirm your email and finish signing up.",
  };
}

export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const limit = rateLimit(await requestKey("forgot-password"), 5, 60_000);
  if (!limit.success) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const h = await headers();
  const origin = h.get("origin");
  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/dashboard/settings`,
  });

  // Always return success, whether or not the email exists, to avoid
  // leaking account existence.
  return {
    error: null,
    success: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
