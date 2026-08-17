"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import {
  generateProductCaptionsSchema,
  generateSocialContentSchema,
  createContentDraftSchema,
  contentDraftIdSchema,
} from "@/lib/validation/marketing";
import {
  generateProductCaptions,
  generateSocialContent,
  createContentDraft,
  approveContentDraft,
  rejectContentDraft,
  markContentPublished,
  InventoryItemNotFoundForContentError,
  ContentDraftNotFoundError,
  InvalidContentDraftTransitionError,
  type GeneratedCaption,
} from "@/services/content-generator.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

function revalidateContentPaths() {
  revalidatePath("/ai-marketing");
  revalidatePath("/ai-marketing/product-marketing");
}

export async function generateProductCaptionsAction(input: unknown): Promise<ActionResult<GeneratedCaption[]>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_CONTENT_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = generateProductCaptionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    const captions = await generateProductCaptions(parsed.data.inventoryItemId, user.id);
    return { ok: true, data: captions };
  } catch (error) {
    if (error instanceof InventoryItemNotFoundForContentError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function generateSocialContentAction(input: unknown): Promise<ActionResult<GeneratedCaption>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_CONTENT_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = generateSocialContentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  try {
    const content = await generateSocialContent(parsed.data, user.id);
    return { ok: true, data: content };
  } catch (error) {
    if (error instanceof InventoryItemNotFoundForContentError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function createContentDraftAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_CONTENT_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createContentDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  const draft = await createContentDraft(parsed.data, user.id);
  revalidateContentPaths();
  return { ok: true, data: { id: draft.id } };
}

export async function approveContentDraftAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_CONTENT_APPROVE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = contentDraftIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    await approveContentDraft(parsed.data.draftId, user.id);
    revalidateContentPaths();
    return { ok: true, data: { id: parsed.data.draftId } };
  } catch (error) {
    if (error instanceof ContentDraftNotFoundError || error instanceof InvalidContentDraftTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function rejectContentDraftAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_CONTENT_APPROVE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = contentDraftIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    await rejectContentDraft(parsed.data.draftId, user.id);
    revalidateContentPaths();
    return { ok: true, data: { id: parsed.data.draftId } };
  } catch (error) {
    if (error instanceof ContentDraftNotFoundError || error instanceof InvalidContentDraftTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function markContentPublishedAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermissionAction(PERMISSIONS.MARKETING_CONTENT_APPROVE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = contentDraftIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    await markContentPublished(parsed.data.draftId);
    revalidateContentPaths();
    return { ok: true, data: { id: parsed.data.draftId } };
  } catch (error) {
    if (error instanceof ContentDraftNotFoundError || error instanceof InvalidContentDraftTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
