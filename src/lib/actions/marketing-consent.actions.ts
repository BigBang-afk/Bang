"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { recordOptInSchema, recordOptOutSchema } from "@/lib/validation/marketing";
import { recordOptIn, recordOptOut, CustomerNotFoundForConsentError } from "@/services/marketing-consent.service";
import type { ActionResult } from "@/lib/actions/action-result";

export async function recordOptInAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requireUser();
    await assertPermission(user, PERMISSIONS.CUSTOMERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = recordOptInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  try {
    await recordOptIn(parsed.data.customerId, parsed.data.source, user.id);
    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { ok: true, data: { ok: true } };
  } catch (error) {
    if (error instanceof CustomerNotFoundForConsentError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function recordOptOutAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requireUser();
    await assertPermission(user, PERMISSIONS.CUSTOMERS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = recordOptOutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  try {
    await recordOptOut(parsed.data.customerId, parsed.data.source, user.id);
    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { ok: true, data: { ok: true } };
  } catch (error) {
    if (error instanceof CustomerNotFoundForConsentError) return { ok: false, error: error.message };
    throw error;
  }
}
