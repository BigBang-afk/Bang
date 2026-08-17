import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createInventoryItem } from "@/services/inventory-item.service";
import {
  generateProductCaptions,
  createContentDraft,
  approveContentDraft,
  rejectContentDraft,
  markContentPublished,
  InvalidContentDraftTransitionError,
} from "@/services/content-generator.service";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";
import type { CreateInventoryItemInput } from "@/types/inventory";

let userId: string;
let categoryId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
  categoryId = await getTestCategoryId();
});

function buildItemInput(overrides: Partial<CreateInventoryItemInput> = {}): CreateInventoryItemInput {
  return {
    productName: `Content Item ${uniqueSuffix()}`,
    categoryId,
    purity: "K21",
    netWeight: 7.5,
    goldRate: 40000,
    wastageType: "FIXED_GRAMS",
    wastageGrams: 0,
    sellingPrice: 320000,
    ...overrides,
  };
}

describe("Product marketing generation (Test 21)", () => {
  it("generates a caption per platform using only the item's real recorded name/purity/weight", async () => {
    const productName = `Signature Necklace ${uniqueSuffix()}`;
    const item = await createInventoryItem(buildItemInput({ productName, purity: "K21", netWeight: 7.5 }), userId);

    const captions = await generateProductCaptions(item.id, userId);
    expect(captions).toHaveLength(4);
    for (const caption of captions) {
      expect(caption.body).toContain(productName);
      expect(caption.body).toContain("K21");
      expect(caption.body).toContain("7.5");
      // Never a fabricated stone/diamond/certification/origin claim — this schema doesn't even record those fields.
      expect(caption.body.toLowerCase()).not.toMatch(/certified|vvs|origin:/);
    }
  });

  it("every generated caption is saved as a DRAFT and requires explicit approval before PUBLISHED", async () => {
    const item = await createInventoryItem(buildItemInput(), userId);
    const [caption] = await generateProductCaptions(item.id, userId);

    const draft = await createContentDraft(
      { inventoryItemId: item.id, platform: caption.platform, contentType: "PRODUCT_SPOTLIGHT", body: caption.body, hashtags: caption.hashtags },
      userId,
    );
    expect(draft.status).toBe("DRAFT");

    const log = await prisma.auditLog.findFirst({ where: { entity: "ContentDraft", entityId: draft.id, action: "AI_CONTENT_GENERATED" } });
    expect(log).not.toBeNull();

    // Cannot skip straight from DRAFT to PUBLISHED.
    await expect(markContentPublished(draft.id)).rejects.toThrow(InvalidContentDraftTransitionError);

    await approveContentDraft(draft.id, userId);
    const approved = await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedById).toBe(userId);

    await markContentPublished(draft.id);
    const published = await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(published.status).toBe("PUBLISHED");
  });

  it("a rejected draft never becomes published", async () => {
    const item = await createInventoryItem(buildItemInput(), userId);
    const draft = await createContentDraft(
      { inventoryItemId: item.id, platform: "INSTAGRAM", contentType: "PRODUCT_SPOTLIGHT", body: "Draft body", hashtags: [] },
      userId,
    );
    await rejectContentDraft(draft.id, userId);
    const rejected = await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(rejected.status).toBe("REJECTED");

    await expect(markContentPublished(draft.id)).rejects.toThrow(InvalidContentDraftTransitionError);
  });
});
