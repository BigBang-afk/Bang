import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminProfile } from "@/types/database";
import type { AdminRole } from "@/lib/constants";
import { logActivity } from "@/lib/activity-log";

export interface CurrentAdmin {
  id: string;
  email: string;
  profile: AdminProfile;
}

/**
 * Resolves the currently logged-in, active admin user. Redirects to the
 * login page if there is no session, the profile is missing, or the account
 * has been deactivated by a Super Admin. Use at the top of every admin
 * Server Component/layout and every admin Server Action.
 */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const adminDb = createAdminClient();
  const { data: profile } = await adminDb
    .from("admin_profiles")
    .select("*")
    .eq("id", user.id)
    .single<AdminProfile>();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=account_inactive");
  }

  return { id: user.id, email: user.email ?? "", profile };
}

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: ["*"],
  admin: [
    "products.*", "categories.*", "collections.*", "gold_rates.*", "inquiries.*",
    "custom_orders.*", "contact_messages.*", "testimonials.*", "banners.*", "settings.*",
  ],
  product_manager: ["products.*", "categories.*", "collections.*", "inquiries.read", "inquiries.update"],
  content_manager: ["testimonials.*", "banners.*", "settings.content", "pages.*"],
};

export function can(role: AdminRole, permission: string): boolean {
  const grants = ROLE_PERMISSIONS[role] ?? [];
  if (grants.includes("*")) return true;
  const [resource] = permission.split(".");
  return grants.includes(permission) || grants.includes(`${resource}.*`);
}

/** Throws (as a redirect-free error) if the admin lacks the given permission. */
export function assertPermission(admin: CurrentAdmin, permission: string) {
  if (!can(admin.profile.role, permission)) {
    throw new Error(`Forbidden: role "${admin.profile.role}" cannot perform "${permission}"`);
  }
}

export async function requirePermission(permission: string): Promise<CurrentAdmin> {
  const admin = await requireAdmin();
  assertPermission(admin, permission);
  return admin;
}

export async function recordAdminAction(
  admin: CurrentAdmin,
  action: string,
  entityType: string,
  entityId: string | null,
  description?: string
) {
  await logActivity({ userId: admin.id, action, entityType, entityId, description });
}
