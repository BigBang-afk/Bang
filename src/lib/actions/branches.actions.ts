"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { createBranchSchema, updateBranchSchema, setUserBranchAccessSchema } from "@/lib/validation/business-intelligence";
import { createBranch, updateBranch, setUserBranchAccess, BranchNotFoundError } from "@/services/branch.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

function revalidateBranchPaths() {
  revalidatePath("/business-intelligence");
  revalidatePath("/business-intelligence/branches");
}

export async function createBranchAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.BI_BRANCH_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createBranchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid branch." };

  const branch = await createBranch(parsed.data, user.id);
  revalidateBranchPaths();
  return { ok: true, data: { id: branch.id } };
}

export async function updateBranchAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.BI_BRANCH_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = updateBranchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid branch." };

  try {
    const { branchId, ...rest } = parsed.data;
    const branch = await updateBranch(branchId, rest, user.id);
    revalidateBranchPaths();
    return { ok: true, data: { id: branch.id } };
  } catch (error) {
    if (error instanceof BranchNotFoundError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function setUserBranchAccessAction(input: unknown): Promise<ActionResult<{ userId: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.BI_BRANCH_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = setUserBranchAccessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid branch access." };

  await setUserBranchAccess(parsed.data.targetUserId, parsed.data.branchAccessMode, parsed.data.branchIds, user.id);
  revalidateBranchPaths();
  return { ok: true, data: { userId: parsed.data.targetUserId } };
}
