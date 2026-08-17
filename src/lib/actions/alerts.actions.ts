"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { alertActionSchema } from "@/lib/validation/business-intelligence";
import { acknowledgeAlert, resolveAlert, dismissAlert, runAllAlertGenerators, AlertNotFoundError } from "@/services/alert.service";
import { getTodayBusinessDate } from "@/lib/business-date";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

function revalidateAlertPaths() {
  revalidatePath("/business-intelligence");
  revalidatePath("/business-intelligence/alerts");
}

async function transitionAction(
  input: unknown,
  transition: (alertId: string, userId: string) => Promise<unknown>,
): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.BI_ALERTS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = alertActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid alert." };

  try {
    await transition(parsed.data.alertId, user.id);
    revalidateAlertPaths();
    return { ok: true, data: { id: parsed.data.alertId } };
  } catch (error) {
    if (error instanceof AlertNotFoundError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function acknowledgeAlertAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return transitionAction(input, acknowledgeAlert);
}

export async function resolveAlertAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return transitionAction(input, resolveAlert);
}

export async function dismissAlertAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return transitionAction(input, dismissAlert);
}

/** Re-runs every alert generator against real, current data — safe to click repeatedly (generators dedupe against any existing OPEN alert for the same entity). */
export async function runAlertScanAction(): Promise<ActionResult<{ generated: number }>> {
  try {
    await requirePermissionAction(PERMISSIONS.BI_ALERTS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const result = await runAllAlertGenerators(getTodayBusinessDate());
  revalidateAlertPaths();
  return { ok: true, data: result };
}
