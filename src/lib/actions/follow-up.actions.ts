"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import {
  createFollowUpTaskSchema,
  createFollowUpTasksFromRecommendationsSchema,
  updateFollowUpTaskStatusSchema,
} from "@/lib/validation/marketing";
import {
  createFollowUpTask,
  createFollowUpTasksFromRecommendations,
  updateFollowUpTaskStatus,
  EmptyFollowUpReasonError,
  FollowUpTaskNotFoundError,
} from "@/services/follow-up.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

function revalidateFollowUpPaths() {
  revalidatePath("/ai-marketing");
  revalidatePath("/ai-marketing/follow-ups");
  revalidatePath("/ai-marketing/customers-to-contact");
}

export async function createFollowUpTaskAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createFollowUpTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  try {
    const task = await createFollowUpTask(parsed.data, user.id);
    revalidateFollowUpPaths();
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    if (error instanceof EmptyFollowUpReasonError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function createFollowUpTasksFromRecommendationsAction(input: unknown): Promise<ActionResult<{ created: number }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createFollowUpTasksFromRecommendationsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  const created = await createFollowUpTasksFromRecommendations(parsed.data.customerIds, user.id);
  revalidateFollowUpPaths();
  return { ok: true, data: { created } };
}

export async function updateFollowUpTaskStatusAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = updateFollowUpTaskStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    await updateFollowUpTaskStatus(parsed.data.taskId, parsed.data.status, user.id);
    revalidateFollowUpPaths();
    return { ok: true, data: { id: parsed.data.taskId } };
  } catch (error) {
    if (error instanceof FollowUpTaskNotFoundError) return { ok: false, error: error.message };
    throw error;
  }
}
