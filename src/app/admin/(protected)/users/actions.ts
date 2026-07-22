"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ROLES, type AdminRole } from "@/lib/constants";

export interface ActionState {
  error?: string;
  success?: string;
}

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().trim().min(2).max(100),
  role: z.enum(ADMIN_ROLES),
});

export async function createAdminUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("users.manage");

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const db = createAdminClient();
  const { data: created, error: authError } = await db.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (authError || !created.user) return { error: authError?.message ?? "Failed to create user." };

  const { error: profileError } = await db.from("admin_profiles").insert({
    id: created.user.id,
    full_name: parsed.data.full_name,
    role: parsed.data.role,
    is_active: true,
  });
  if (profileError) return { error: `User created, but failed to create profile: ${profileError.message}` };

  await recordAdminAction(admin, "admin_user_created", "admin_profiles", created.user.id, `${parsed.data.email} (${parsed.data.role})`);
  revalidatePath("/admin/users");

  return { success: `Admin account created for ${parsed.data.email}.` };
}

export async function updateAdminUserRoleAction(userId: string, role: AdminRole) {
  const admin = await requirePermission("users.manage");
  if (!ADMIN_ROLES.includes(role)) throw new Error("Invalid role");
  const db = createAdminClient();
  await db.from("admin_profiles").update({ role }).eq("id", userId);
  await recordAdminAction(admin, "admin_user_role_updated", "admin_profiles", userId, role);
  revalidatePath("/admin/users");
}

export async function toggleAdminUserActiveAction(userId: string, isActive: boolean) {
  const admin = await requirePermission("users.manage");
  const db = createAdminClient();
  await db.from("admin_profiles").update({ is_active: isActive }).eq("id", userId);
  await recordAdminAction(admin, "admin_user_toggled", "admin_profiles", userId, isActive ? "activated" : "deactivated");
  revalidatePath("/admin/users");
}
