import { describe, expect, it, beforeAll } from "vitest";
import { createCustomer } from "@/services/customer.service";
import { createInventoryItem } from "@/services/inventory-item.service";
import { completeSale } from "@/services/sale-transaction.service";
import { computeAiSegments, getAiCustomerSegments } from "@/services/ai-segmentation.service";
import { getSegmentationConfig } from "@/services/customer-analytics.service";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";
import type { CreateInventoryItemInput } from "@/types/inventory";
import { Prisma } from "@/generated/prisma/client";

let userId: string;
let categoryId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
  categoryId = await getTestCategoryId();
});

function uniquePhone(): string {
  const digits = (Date.now() % 1e8).toString().padStart(8, "0");
  return `+923${digits}${Math.floor(Math.random() * 10)}`;
}

function buildItemInput(overrides: Partial<CreateInventoryItemInput> = {}): CreateInventoryItemInput {
  return {
    productName: `AI Segment Item ${uniqueSuffix()}`,
    categoryId,
    purity: "K22",
    netWeight: 10,
    goldRate: 40000,
    wastageType: "PERCENTAGE",
    wastagePercent: 5,
    sellingPrice: 500000,
    ...overrides,
  };
}

describe("AI segmentation (Tests 1, 3, 4) — computeAiSegments composes Phase 4 rules, never invents a segment", () => {
  it("classifies purchasing-behavior segments purely from real facts (Test 1: segmentation)", async () => {
    const config = await getSegmentationConfig();
    const now = new Date();

    const goldBuyer = computeAiSegments(
      {
        createdAt: now,
        lastPurchaseAt: now,
        totalSpending: "0",
        outstandingBalance: "0",
        purchaseCount: 1,
        hasGoldPurchase: true,
        hasDiamondPurchase: false,
        hasBridalPurchase: false,
      },
      config,
      now,
    );
    expect(goldBuyer).toContain("GOLD_BUYER");
    expect(goldBuyer).not.toContain("DIAMOND_BUYER");

    const diamondBuyer = computeAiSegments(
      {
        createdAt: now,
        lastPurchaseAt: now,
        totalSpending: "0",
        outstandingBalance: "0",
        purchaseCount: 1,
        hasGoldPurchase: false,
        hasDiamondPurchase: true,
        hasBridalPurchase: false,
      },
      config,
      now,
    );
    expect(diamondBuyer).toContain("DIAMOND_BUYER");

    const repeatCustomer = computeAiSegments(
      {
        createdAt: now,
        lastPurchaseAt: now,
        totalSpending: "0",
        outstandingBalance: "0",
        purchaseCount: 2,
        hasGoldPurchase: false,
        hasDiamondPurchase: false,
        hasBridalPurchase: false,
      },
      config,
      now,
    );
    expect(repeatCustomer).toContain("REPEAT_CUSTOMER");
  });

  it("classifies VIP purely from real total spending, matching the exact Phase 4 VIP threshold (Test 3: VIP detection)", async () => {
    const config = await getSegmentationConfig();
    const now = new Date();

    const vip = computeAiSegments(
      {
        createdAt: now,
        lastPurchaseAt: now,
        totalSpending: config.vipThreshold.toString(),
        outstandingBalance: "0",
        purchaseCount: 1,
        hasGoldPurchase: false,
        hasDiamondPurchase: false,
        hasBridalPurchase: false,
      },
      config,
      now,
    );
    expect(vip).toContain("VIP");

    const notVip = computeAiSegments(
      {
        createdAt: now,
        lastPurchaseAt: now,
        totalSpending: config.vipThreshold.sub(1).toString(),
        outstandingBalance: "0",
        purchaseCount: 1,
        hasGoldPurchase: false,
        hasDiamondPurchase: false,
        hasBridalPurchase: false,
      },
      config,
      now,
    );
    expect(notVip).not.toContain("VIP");
  });

  it("classifies inactive purely from days since last purchase, matching the configured threshold (Test 4: inactive detection)", async () => {
    const config = await getSegmentationConfig();
    const now = new Date();
    const longAgo = new Date(now.getTime() - (config.inactivityDays + 10) * 24 * 60 * 60 * 1000);
    const recent = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    const inactive = computeAiSegments(
      { createdAt: longAgo, lastPurchaseAt: longAgo, totalSpending: "0", outstandingBalance: "0", purchaseCount: 1, hasGoldPurchase: false, hasDiamondPurchase: false, hasBridalPurchase: false },
      config,
      now,
    );
    expect(inactive).toContain("INACTIVE");

    const active = computeAiSegments(
      { createdAt: longAgo, lastPurchaseAt: recent, totalSpending: "0", outstandingBalance: "0", purchaseCount: 1, hasGoldPurchase: false, hasDiamondPurchase: false, hasBridalPurchase: false },
      config,
      now,
    );
    expect(active).not.toContain("INACTIVE");
  });

  it("a real gold purchase (via a real completed sale) produces GOLD_BUYER for that exact customer, end to end", async () => {
    const customer = await createCustomer({ firstName: `Segment E2E ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createInventoryItem(buildItemInput({ purity: "K22" }), userId);

    await completeSale(
      { customerId: customer.id, items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const segments = await getAiCustomerSegments(customer.id);
    expect(segments).toContain("GOLD_BUYER");
  });
});

describe("RFM calculation (Test 2)", () => {
  it("computes recency/frequency/monetary from real sales and scores them against configurable bands", async () => {
    const { getRfmProfile, scoreRecency, scoreFrequency, scoreMonetary } = await import("@/services/customer-scoring.service");

    // Pure scoring functions — deterministic, no DB.
    expect(scoreRecency(10)).toBe(5);
    expect(scoreRecency(200)).toBe(1);
    expect(scoreRecency(null)).toBe(1);
    expect(scoreFrequency(0)).toBe(1);
    expect(scoreFrequency(10)).toBe(5);
    const vipThreshold = new Prisma.Decimal(1000000);
    expect(scoreMonetary(new Prisma.Decimal(0), vipThreshold)).toBe(1);
    expect(scoreMonetary(vipThreshold, vipThreshold)).toBe(5);

    // End-to-end: a real customer with one real recent sale.
    const customer = await createCustomer({ firstName: `RFM ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createInventoryItem(buildItemInput(), userId);
    await completeSale(
      { customerId: customer.id, items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const profile = await getRfmProfile(customer.id);
    expect(profile.frequency).toBe(1);
    expect(profile.monetary).toBe("500000");
    expect(profile.recencyDays).toBe(0);
    expect(profile.recencyScore).toBe(5);
  });
});
