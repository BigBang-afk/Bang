import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, RoleRow } from "@/types/database";

export interface SessionProfile extends ProfileRow {
  role: RoleRow["name"];
}

/**
 * Returns the signed-in user's profile (with resolved role name), or null
 * if signed out. Safe to call from any Server Component.
 */
export async function getCurrentProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, roles(name)")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const { roles, ...rest } = profile as unknown as ProfileRow & {
    roles: { name: RoleRow["name"] } | null;
  };

  return { ...rest, role: roles?.name ?? "user" };
}

/**
 * Redirects to /login when signed out. Use in Server Components that back
 * a protected route as a second, page-level check in addition to the
 * middleware redirect (defense in depth).
 */
export async function requireUser(nextPath = "/dashboard"): Promise<SessionProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return profile;
}

/**
 * Redirects non-admins away from admin-only routes. Authorization is
 * re-checked here (not just hidden via the sidebar) and is also enforced
 * server-side by RLS policies (public.is_admin()) on every table read.
 */
export async function requireAdmin(): Promise<SessionProfile> {
  const profile = await requireUser("/admin");
  if (profile.role !== "admin" && profile.role !== "superadmin") {
    redirect("/dashboard");
  }
  return profile;
}
