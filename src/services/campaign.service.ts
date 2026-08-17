import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { validateMessageSafety } from "@/services/message-safety.service";
import { resolveAudience, type AudienceFilters } from "@/services/audience-builder.service";
import type { CampaignObjective, CampaignType, MarketingChannel, MessageLanguage } from "@/generated/prisma/client";

/**
 * Campaign lifecycle — see CAMPAIGN-SYSTEM.md "Campaign builder" /
 * "Statuses". A campaign never skips DRAFT -> PENDING_APPROVAL -> SCHEDULED
 * -> RUNNING; the one thing that can shortcut PENDING_APPROVAL is an
 * Automation Rule that was itself explicitly enabled by a human (see
 * automation.service.ts), never an unattended default.
 */

export class CampaignNotFoundError extends Error {
  constructor(message = "Campaign not found.") {
    super(message);
    this.name = "CampaignNotFoundError";
  }
}

export class InvalidCampaignStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCampaignStatusTransitionError";
  }
}

export class NoEligibleAudienceError extends Error {
  constructor(message = "No eligible customers in this campaign's audience — nothing to launch.") {
    super(message);
    this.name = "NoEligibleAudienceError";
  }
}

export type CreateCampaignInput = {
  name: string;
  description?: string;
  objective: CampaignObjective;
  campaignType: CampaignType;
  audienceFilters: AudienceFilters;
  channel?: MarketingChannel;
  language?: MessageLanguage;
  productId?: string;
  offer?: string;
  expiryDate?: Date;
  messageTemplate: string;
  scheduledAt?: Date;
};

export async function createCampaignDraft(input: CreateCampaignInput, userId: string) {
  const campaign = await prisma.campaign.create({
    data: {
      name: input.name,
      description: input.description,
      objective: input.objective,
      campaignType: input.campaignType,
      audienceFilters: input.audienceFilters as never,
      channel: input.channel ?? "WHATSAPP",
      language: input.language ?? "ENGLISH",
      productId: input.productId,
      offer: input.offer,
      expiryDate: input.expiryDate,
      messageTemplate: input.messageTemplate,
      scheduledAt: input.scheduledAt,
      status: "DRAFT",
      createdById: userId,
    },
  });

  await writeAuditLog({ userId, action: "CAMPAIGN_CREATED", entity: "Campaign", entityId: campaign.id, metadata: { name: input.name, campaignType: input.campaignType } });
  return campaign;
}

export async function updateCampaignDraft(campaignId: string, input: Partial<CreateCampaignInput>) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new CampaignNotFoundError();
  if (campaign.status !== "DRAFT") {
    throw new InvalidCampaignStatusTransitionError("Only a DRAFT campaign can be edited — cancel and recreate otherwise.");
  }

  return prisma.campaign.update({
    where: { id: campaignId },
    data: {
      name: input.name,
      description: input.description,
      objective: input.objective,
      campaignType: input.campaignType,
      audienceFilters: input.audienceFilters as never,
      channel: input.channel,
      language: input.language,
      productId: input.productId,
      offer: input.offer,
      expiryDate: input.expiryDate,
      messageTemplate: input.messageTemplate,
      scheduledAt: input.scheduledAt,
    },
  });
}

/** DRAFT -> PENDING_APPROVAL. Refuses a template that fails message safety validation — see message-safety.service.ts. */
export async function submitCampaignForApproval(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new CampaignNotFoundError();
  if (campaign.status !== "DRAFT") {
    throw new InvalidCampaignStatusTransitionError("Only a DRAFT campaign can be submitted for approval.");
  }

  const { safe, violations } = validateMessageSafety(campaign.messageTemplate, { authorizedOffer: campaign.offer ?? undefined });
  if (!safe) {
    throw new InvalidCampaignStatusTransitionError(`Message failed safety validation: ${violations.map((v) => v.message).join(" ")}`);
  }

  const updated = await prisma.campaign.update({ where: { id: campaignId }, data: { status: "PENDING_APPROVAL" } });
  return updated;
}

/** PENDING_APPROVAL -> SCHEDULED. Requires marketing:campaigns_approve at the action layer — this function itself is the record of who approved and when. */
export async function approveCampaign(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new CampaignNotFoundError();
  if (campaign.status !== "PENDING_APPROVAL") {
    throw new InvalidCampaignStatusTransitionError("Only a campaign pending approval can be approved.");
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SCHEDULED", approvedById: userId, approvedAt: new Date(), scheduledAt: campaign.scheduledAt ?? new Date() },
  });

  await writeAuditLog({ userId, action: "CAMPAIGN_APPROVED", entity: "Campaign", entityId: campaignId });
  return updated;
}

/**
 * SCHEDULED -> RUNNING. The compliance gate the spec requires: refuses to
 * launch a campaign with zero eligible (consented, non-excluded) audience
 * members. Actually queuing the messages is a separate call
 * (message-queue.service.ts's `queueCampaignMessages`) so a launch and a
 * queue failure are never conflated into one all-or-nothing step.
 */
export async function launchCampaign(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new CampaignNotFoundError();
  if (campaign.status !== "SCHEDULED") {
    throw new InvalidCampaignStatusTransitionError("Only a SCHEDULED campaign can be launched.");
  }

  const audience = await resolveAudience((campaign.audienceFilters as AudienceFilters) ?? {}, campaignId);
  if (audience.eligibleCount === 0) throw new NoEligibleAudienceError();

  const updated = await prisma.campaign.update({ where: { id: campaignId }, data: { status: "RUNNING", launchedAt: new Date() } });
  await writeAuditLog({ userId, action: "CAMPAIGN_LAUNCHED", entity: "Campaign", entityId: campaignId, metadata: { eligibleCount: audience.eligibleCount } });
  return { campaign: updated, audience };
}

export async function pauseCampaign(campaignId: string, userId: string, reason?: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new CampaignNotFoundError();
  if (campaign.status !== "RUNNING") {
    throw new InvalidCampaignStatusTransitionError("Only a RUNNING campaign can be paused.");
  }

  const updated = await prisma.campaign.update({ where: { id: campaignId }, data: { status: "PAUSED", pausedAt: new Date() } });
  await writeAuditLog({ userId, action: "CAMPAIGN_PAUSED", entity: "Campaign", entityId: campaignId, metadata: { reason } });
  return updated;
}

export async function resumeCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new CampaignNotFoundError();
  if (campaign.status !== "PAUSED") {
    throw new InvalidCampaignStatusTransitionError("Only a PAUSED campaign can be resumed.");
  }
  return prisma.campaign.update({ where: { id: campaignId }, data: { status: "RUNNING" } });
}

const CANCELLABLE_STATUSES = ["DRAFT", "PENDING_APPROVAL", "SCHEDULED", "RUNNING", "PAUSED"] as const;

export async function cancelCampaign(campaignId: string, userId: string, reason?: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new CampaignNotFoundError();
  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(campaign.status)) {
    throw new InvalidCampaignStatusTransitionError("This campaign can no longer be cancelled.");
  }

  const updated = await prisma.campaign.update({ where: { id: campaignId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  await prisma.campaignMessage.updateMany({
    where: { campaignId, status: { in: ["QUEUED", "PROCESSING"] } },
    data: { status: "CANCELLED" },
  });
  await writeAuditLog({ userId, action: "CAMPAIGN_CANCELLED", entity: "Campaign", entityId: campaignId, metadata: { reason } });
  return updated;
}

/** Called by the queue processor once every message has reached a terminal state. */
export async function markCampaignCompletedIfFinished(campaignId: string): Promise<void> {
  const [campaign, pendingCount] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } }),
    prisma.campaignMessage.count({ where: { campaignId, status: { in: ["QUEUED", "PROCESSING"] } } }),
  ]);
  if (campaign?.status === "RUNNING" && pendingCount === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "COMPLETED", completedAt: new Date() } });
  }
}

export async function getCampaignById(campaignId: string) {
  return prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      product: { select: { id: true, product: { select: { name: true } } } },
    },
  });
}

export type ListCampaignsFilters = { status?: string; campaignType?: string };

export async function listCampaigns(filters: ListCampaignsFilters = {}) {
  return prisma.campaign.findMany({
    where: { status: filters.status as never, campaignType: filters.campaignType as never },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
    take: 200,
  });
}

export async function addManualExclusion(campaignId: string, customerId: string, reason: string | undefined, userId: string) {
  await prisma.campaignAudienceExclusion.upsert({
    where: { campaignId_customerId: { campaignId, customerId } },
    update: { reason, excludedById: userId },
    create: { campaignId, customerId, reason, excludedById: userId },
  });
}

export async function removeManualExclusion(campaignId: string, customerId: string) {
  await prisma.campaignAudienceExclusion.deleteMany({ where: { campaignId, customerId } });
}
