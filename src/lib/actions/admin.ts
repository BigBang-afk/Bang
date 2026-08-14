"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.coerce.number().int().min(1).max(3),
});

export async function updateUserRoleAction(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = updateRoleSchema.safeParse({
    userId: formData.get("userId"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) return;

  // Only a superadmin may grant or revoke admin/superadmin access — an
  // admin escalating their own or another account's privileges would
  // defeat the point of the distinction.
  if (admin.role !== "superadmin") return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role_id: parsed.data.roleId })
    .eq("id", parsed.data.userId);

  if (!error) {
    await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      actor_role: admin.role,
      action: "user.role_updated",
      entity_type: "profile",
      entity_id: parsed.data.userId,
      metadata: { role_id: parsed.data.roleId },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/audit-logs");
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  fullName: string | null;
  displayName: string | null;
  roleId: number;
  roleName: string;
  isSuspended: boolean;
  createdAt: string;
}

/**
 * Joins profiles with their auth email via the Auth Admin API. Requires
 * the service role key — this must only ever run in trusted server-side
 * admin code, never in anything reachable from the browser.
 */
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*, roles(name)")
    .order("created_at", { ascending: false });

  if (!profiles) return [];

  let emailById = new Map<string, string>();
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    emailById = new Map(data.users.map((u) => [u.id, u.email ?? ""]));
  } catch {
    // SUPABASE_SERVICE_ROLE_KEY not configured yet — fall back to showing
    // profiles without email rather than failing the whole page.
  }

  return (profiles as never[]).map((p) => {
    const row = p as {
      id: string;
      full_name: string | null;
      display_name: string | null;
      role_id: number;
      roles: { name: string } | null;
      is_suspended: boolean;
      created_at: string;
    };
    return {
      id: row.id,
      email: emailById.get(row.id) ?? null,
      fullName: row.full_name,
      displayName: row.display_name,
      roleId: row.role_id,
      roleName: row.roles?.name ?? "user",
      isSuspended: row.is_suspended,
      createdAt: row.created_at,
    };
  });
}
