import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createCustomer } from "@/services/customer.service";
import { createInventoryItem } from "@/services/inventory-item.service";
import { completeSale } from "@/services/sale-transaction.service";
import { recordOptIn } from "@/services/marketing-consent.service";
import { createCampaignDraft, submitCampaignForApproval, approveCampaign, launchCampaign } from "@/services/campaign.service";
import { getCampaignAttribution, getCampaignAnalytics } from "@/services/campaign-analytics.service";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";
import type { CreateInventoryItemInput } from "@/types/inventory";

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
    productName: `Attribution Item ${uniqueSuffix()}`,
    categoryId,
    purity: "K22",
    netWeight: 5,
    goldRate: 40000,
    wastageType: "PERCENTAGE",
    wastagePercent: 5,
    sellingPrice: 250000,
    ...overrides,
  };
}

async function launchedCampaignFor(customerId: string) {
  const campaign = await createCampaignDraft(
    {
      name: `Attribution Test ${uniqueSuffix()}`,
      objective: "SALES",
      campaignType: "SPECIAL_OFFER",
      audienceFilters: { requireOptedIn: true, customerIds: [customerId] },
      messageTemplate: "Hello {{customer_name}}, check out our new arrivals.",
    },
    userId,
  );
  await submitCampaignForApproval(campaign.id);
  await approveCampaign(campaign.id, userId);
  await launchCampaign(campaign.id, userId);
  return campaign;
}

describe("Campaign attribution (Test 15)", () => {
  it("classifies a purchase within the attribution window, with no other campaign touch, as DIRECT", async () => {
    const customer = await createCustomer({ firstName: `Direct ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);
    const campaign = await launchedCampaignFor(customer.id);

    // Manually create a SENT message (bypassing the real queue+send flow, which
    // this test doesn't need) so attribution has a concrete sentAt to measure from.
    await prisma.campaignMessage.create({
      data: {
        campaignId: campaign.id,
        customerId: customer.id,
        channel: "WHATSAPP",
        message: "Hello.",
        status: "SENT",
        providerMessageId: `attr-${uniqueSuffix()}`,
        sentAt: new Date(),
      },
    });

    const item = await createInventoryItem(buildItemInput(), userId);
    await completeSale(
      { customerId: customer.id, items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 250000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const attribution = await getCampaignAttribution(campaign.id);
    expect(attribution.direct.orderCount).toBe(1);
    expect(attribution.direct.revenue).toBe("250000");
    expect(attribution.assisted.orderCount).toBe(0);
  });

  it("classifies a purchase as ASSISTED when a second campaign also touched the same customer before the sale", async () => {
    const customer = await createCustomer({ firstName: `Assisted ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);
    const campaignA = await launchedCampaignFor(customer.id);
    const campaignB = await launchedCampaignFor(customer.id);

    const sentAt = new Date();
    await prisma.campaignMessage.create({
      data: { campaignId: campaignA.id, customerId: customer.id, channel: "WHATSAPP", message: "A", status: "SENT", providerMessageId: `attr-${uniqueSuffix()}`, sentAt },
    });
    await prisma.campaignMessage.create({
      data: { campaignId: campaignB.id, customerId: customer.id, channel: "WHATSAPP", message: "B", status: "SENT", providerMessageId: `attr-${uniqueSuffix()}`, sentAt },
    });

    const item = await createInventoryItem(buildItemInput(), userId);
    await completeSale(
      { customerId: customer.id, items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 250000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const attributionA = await getCampaignAttribution(campaignA.id);
    expect(attributionA.assisted.orderCount).toBe(1);
    expect(attributionA.direct.orderCount).toBe(0);
  });

  it("never attributes a purchase that happened before the campaign message was even sent", async () => {
    const customer = await createCustomer({ firstName: `TooEarly ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);

    const item = await createInventoryItem(buildItemInput(), userId);
    await completeSale(
      { customerId: customer.id, items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 250000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const campaign = await launchedCampaignFor(customer.id);
    await prisma.campaignMessage.create({
      data: {
        campaignId: campaign.id,
        customerId: customer.id,
        channel: "WHATSAPP",
        message: "Hello.",
        status: "SENT",
        providerMessageId: `attr-${uniqueSuffix()}`,
        sentAt: new Date(),
      },
    });

    const attribution = await getCampaignAttribution(campaign.id);
    expect(attribution.direct.orderCount).toBe(0);
    expect(attribution.assisted.orderCount).toBe(0);
  });
});

describe("Delivery/read/reply rates", () => {
  it("computes rates only from messages that actually left the queue", async () => {
    const customer = await createCustomer({ firstName: `Rates ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);
    const campaign = await launchedCampaignFor(customer.id);

    await prisma.campaignMessage.create({
      data: { campaignId: campaign.id, customerId: customer.id, channel: "WHATSAPP", message: "Hello.", status: "READ", providerMessageId: `r-${uniqueSuffix()}`, sentAt: new Date(), deliveredAt: new Date(), readAt: new Date() },
    });

    const analytics = await getCampaignAnalytics(campaign.id);
    expect(analytics.sentTotal).toBe(1);
    expect(analytics.delivered).toBe(0);
    expect(analytics.read).toBe(1);
    expect(analytics.deliveryRate).toBe("100.0");
    expect(analytics.readRate).toBe("100.0");
  });
});
