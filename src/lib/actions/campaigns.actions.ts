"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignIdSchema,
  cancelCampaignSchema,
  pauseCampaignSchema,
  audiencePreviewSchema,
  addManualExclusionSchema,
  removeManualExclusionSchema,
} from "@/lib/validation/marketing";
import {
  createCampaignDraft,
  updateCampaignDraft,
  submitCampaignForApproval,
  approveCampaign,
  launchCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  addManualExclusion,
  removeManualExclusion,
  CampaignNotFoundError,
  InvalidCampaignStatusTransitionError,
  NoEligibleAudienceError,
} from "@/services/campaign.service";
import { queueCampaignMessages } from "@/services/message-queue.service";
import { resolveAudience } from "@/services/audience-builder.service";
import { searchInventoryForSale } from "@/services/inventory-item.service";
import type { PosCatalogItem } from "@/types/sales";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

function revalidateCampaignPaths() {
  revalidatePath("/ai-marketing");
  revalidatePath("/ai-marketing/campaigns");
}

export async function createCampaignAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_CAMPAIGNS_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid campaign." };

  const campaign = await createCampaignDraft(parsed.data, user.id);
  revalidateCampaignPaths();
  return { ok: true, data: { id: campaign.id } };
}

export async function updateCampaignAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermissionAction(PERMISSIONS.MARKETING_CAMPAIGNS_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = updateCampaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid campaign." };

  try {
    const { campaignId, ...rest } = parsed.data;
    await updateCampaignDraft(campaignId, rest);
    revalidateCampaignPaths();
    return { ok: true, data: { id: campaignId } };
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof InvalidCampaignStatusTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function submitCampaignForApprovalAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermissionAction(PERMISSIONS.MARKETING_CAMPAIGNS_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = campaignIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    await submitCampaignForApproval(parsed.data.campaignId);
    revalidateCampaignPaths();
    return { ok: true, data: { id: parsed.data.campaignId } };
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof InvalidCampaignStatusTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function approveCampaignAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_CAMPAIGNS_APPROVE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = campaignIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    await approveCampaign(parsed.data.campaignId, user.id);
    revalidateCampaignPaths();
    return { ok: true, data: { id: parsed.data.campaignId } };
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof InvalidCampaignStatusTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

/** Launches the campaign AND queues its messages in one action — the compliance gate (zero eligible audience) is enforced inside launchCampaign() before anything is queued. */
export async function launchCampaignAction(input: unknown): Promise<ActionResult<{ id: string; queued: number }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_CAMPAIGNS_LAUNCH);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = campaignIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    await launchCampaign(parsed.data.campaignId, user.id);
    const { queued } = await queueCampaignMessages(parsed.data.campaignId, user.id);
    revalidateCampaignPaths();
    return { ok: true, data: { id: parsed.data.campaignId, queued } };
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof InvalidCampaignStatusTransitionError || error instanceof NoEligibleAudienceError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function pauseCampaignAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_CAMPAIGNS_LAUNCH);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = pauseCampaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    await pauseCampaign(parsed.data.campaignId, user.id, parsed.data.reason);
    revalidateCampaignPaths();
    return { ok: true, data: { id: parsed.data.campaignId } };
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof InvalidCampaignStatusTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function resumeCampaignAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermissionAction(PERMISSIONS.MARKETING_CAMPAIGNS_LAUNCH);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = campaignIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    await resumeCampaign(parsed.data.campaignId);
    revalidateCampaignPaths();
    return { ok: true, data: { id: parsed.data.campaignId } };
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof InvalidCampaignStatusTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function cancelCampaignAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_CAMPAIGNS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = cancelCampaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    await cancelCampaign(parsed.data.campaignId, user.id, parsed.data.reason);
    revalidateCampaignPaths();
    return { ok: true, data: { id: parsed.data.campaignId } };
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof InvalidCampaignStatusTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function previewAudienceAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof resolveAudience>>>> {
  try {
    await requirePermissionAction(PERMISSIONS.MARKETING_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = audiencePreviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid filters." };

  const audience = await resolveAudience(parsed.data.filters, parsed.data.campaignId);
  return { ok: true, data: audience };
}

export async function addManualExclusionAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.MARKETING_CAMPAIGNS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = addManualExclusionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  await addManualExclusion(parsed.data.campaignId, parsed.data.customerId, parsed.data.reason, user.id);
  revalidateCampaignPaths();
  return { ok: true, data: { ok: true } };
}

export async function searchProductsForCampaignAction(query: string): Promise<ActionResult<PosCatalogItem[]>> {
  try {
    await requirePermissionAction(PERMISSIONS.MARKETING_CAMPAIGNS_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }
  if (!query || query.trim().length < 2) return { ok: true, data: [] };
  const items = await searchInventoryForSale(query);
  return { ok: true, data: items };
}

export async function removeManualExclusionAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  try {
    await requirePermissionAction(PERMISSIONS.MARKETING_CAMPAIGNS_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = removeManualExclusionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  await removeManualExclusion(parsed.data.campaignId, parsed.data.customerId);
  revalidateCampaignPaths();
  return { ok: true, data: { ok: true } };
}
