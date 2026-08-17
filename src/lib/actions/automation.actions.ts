"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { createAutomationRuleSchema, setAutomationRuleStatusSchema, runAutomationRuleSchema } from "@/lib/validation/marketing";
import {
  createAutomationRule,
  setAutomationRuleStatus,
  runAutomationRule,
  AutomationRuleNotFoundError,
  InvalidAutomationStatusTransitionError,
  type RunAutomationResult,
} from "@/services/automation.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

function revalidateAutomationPaths() {
  revalidatePath("/ai-marketing/automation-rules");
}

export async function createAutomationRuleAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_AUTOMATION_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createAutomationRuleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  const rule = await createAutomationRule(parsed.data, user.id);
  revalidateAutomationPaths();
  return { ok: true, data: { id: rule.id } };
}

export async function setAutomationRuleStatusAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_AUTOMATION_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = setAutomationRuleStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    await setAutomationRuleStatus(parsed.data.ruleId, parsed.data.status, user.id);
    revalidateAutomationPaths();
    return { ok: true, data: { id: parsed.data.ruleId } };
  } catch (error) {
    if (error instanceof AutomationRuleNotFoundError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function runAutomationRuleAction(input: unknown): Promise<ActionResult<RunAutomationResult>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_AUTOMATION_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = runAutomationRuleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    const result = await runAutomationRule(parsed.data.ruleId, user.id);
    revalidateAutomationPaths();
    revalidatePath("/ai-marketing/follow-ups");
    revalidatePath("/ai-marketing/campaigns");
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof AutomationRuleNotFoundError || error instanceof InvalidAutomationStatusTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
