import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { callGenerateText } from "@/services/ai/ai-call";
import type { ContentPlatform, ContentType } from "@/generated/prisma/client";

/**
 * AI Product Marketing + Social Media Content — see AI-MARKETING.md
 * "Product marketing" / "Social media content" / "Content approval".
 * Every generated caption is built only from the InventoryItem/Product's
 * own recorded fields (name, purity, weight, category) — never a
 * fabricated stone/diamond quality, certification, or origin, since this
 * schema doesn't even record those fields for a caption to invent.
 * Every draft starts (and stays, in this phase) DRAFT until a human
 * explicitly approves it; nothing is ever auto-published.
 */

export class InventoryItemNotFoundForContentError extends Error {
  constructor(message = "Inventory item not found.") {
    super(message);
    this.name = "InventoryItemNotFoundForContentError";
  }
}

async function getProductFacts(inventoryItemId: string) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    select: {
      purity: true,
      netWeight: true,
      product: { select: { name: true, category: { select: { name: true } } } },
    },
  });
  if (!item) throw new InventoryItemNotFoundForContentError();
  return {
    productName: item.product.name,
    purity: item.purity,
    netWeight: item.netWeight.toString(),
    categoryName: item.product.category.name,
  };
}

const PLATFORM_TASK: Record<"INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "WHATSAPP", string> = {
  INSTAGRAM: "product_caption_instagram",
  FACEBOOK: "product_caption_facebook",
  TIKTOK: "product_caption_tiktok",
  WHATSAPP: "product_caption_whatsapp",
};

export type GeneratedCaption = { platform: ContentPlatform; body: string; hashtags: string[]; callToAction: string };

/** Generates a caption for every platform for one inventory item — used by the Product Marketing screen's "generate all" action. */
export async function generateProductCaptions(inventoryItemId: string, userId: string | null): Promise<GeneratedCaption[]> {
  const facts = await getProductFacts(inventoryItemId);

  const platforms = Object.keys(PLATFORM_TASK) as (keyof typeof PLATFORM_TASK)[];
  const results = await Promise.all(
    platforms.map(async (platform) => {
      const { text } = await callGenerateText({ task: PLATFORM_TASK[platform], facts }, userId);
      return {
        platform: platform as ContentPlatform,
        body: text,
        hashtags: [`#${facts.categoryName.replace(/\s+/g, "")}`, "#ZarghoonJewellers", `#${facts.purity}`],
        callToAction: "Visit us or message to know more.",
      };
    }),
  );
  return results;
}

export type GenerateSocialContentInput = {
  platform: ContentPlatform;
  contentType: ContentType;
  inventoryItemId?: string;
  festivalName?: string;
};

export async function generateSocialContent(input: GenerateSocialContentInput, userId: string | null): Promise<GeneratedCaption> {
  const productFacts = input.inventoryItemId ? await getProductFacts(input.inventoryItemId) : {};
  const { text } = await callGenerateText(
    { task: "social_content", facts: { ...productFacts, contentType: input.contentType, festivalName: input.festivalName ?? null } },
    userId,
  );
  return { platform: input.platform, body: text, hashtags: ["#ZarghoonJewellers"], callToAction: "" };
}

export type CreateContentDraftInput = {
  inventoryItemId?: string;
  platform: ContentPlatform;
  contentType: ContentType;
  title?: string;
  body: string;
  hashtags: string[];
  callToAction?: string;
};

export async function createContentDraft(input: CreateContentDraftInput, userId: string) {
  const draft = await prisma.contentDraft.create({
    data: {
      inventoryItemId: input.inventoryItemId,
      platform: input.platform,
      contentType: input.contentType,
      title: input.title,
      body: input.body,
      hashtags: input.hashtags,
      callToAction: input.callToAction,
      status: "DRAFT",
      createdById: userId,
    },
  });
  await writeAuditLog({ userId, action: "AI_CONTENT_GENERATED", entity: "ContentDraft", entityId: draft.id, metadata: { platform: input.platform, contentType: input.contentType } });
  return draft;
}

export class ContentDraftNotFoundError extends Error {
  constructor(message = "Content draft not found.") {
    super(message);
    this.name = "ContentDraftNotFoundError";
  }
}

export class InvalidContentDraftTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidContentDraftTransitionError";
  }
}

export async function approveContentDraft(draftId: string, userId: string) {
  const draft = await prisma.contentDraft.findUnique({ where: { id: draftId } });
  if (!draft) throw new ContentDraftNotFoundError();
  if (draft.status !== "DRAFT") throw new InvalidContentDraftTransitionError("Only a DRAFT content item can be approved.");
  return prisma.contentDraft.update({ where: { id: draftId }, data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() } });
}

/** `approvedById`/`approvedAt` record who made the DRAFT -> REJECTED decision too — the same "who decided" field, reused rather than adding a parallel rejectedBy column. */
export async function rejectContentDraft(draftId: string, userId: string) {
  const draft = await prisma.contentDraft.findUnique({ where: { id: draftId } });
  if (!draft) throw new ContentDraftNotFoundError();
  if (draft.status !== "DRAFT") throw new InvalidContentDraftTransitionError("Only a DRAFT content item can be rejected.");
  return prisma.contentDraft.update({ where: { id: draftId }, data: { status: "REJECTED", approvedById: userId, approvedAt: new Date() } });
}

/** Record-keeping only — Phase 7 never publishes anything itself; this marks that a human published it manually elsewhere. */
export async function markContentPublished(draftId: string) {
  const draft = await prisma.contentDraft.findUnique({ where: { id: draftId } });
  if (!draft) throw new ContentDraftNotFoundError();
  if (draft.status !== "APPROVED") throw new InvalidContentDraftTransitionError("Only an APPROVED content item can be marked published.");
  return prisma.contentDraft.update({ where: { id: draftId }, data: { status: "PUBLISHED" } });
}

export type ListContentDraftFilters = { status?: string; platform?: string };

export async function listContentDrafts(filters: ListContentDraftFilters = {}) {
  return prisma.contentDraft.findMany({
    where: { status: filters.status as never, platform: filters.platform as never },
    include: { inventoryItem: { select: { id: true, product: { select: { name: true } } } }, createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
