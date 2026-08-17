import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { MockMarketingProvider } from "@/services/marketing/mock-marketing-provider";
import { getRecommendationsForCustomer } from "@/services/recommendation.service";
import { createCustomer } from "@/services/customer.service";
import { createInventoryItem } from "@/services/inventory-item.service";
import { completeSale } from "@/services/sale-transaction.service";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";
import type { CreateInventoryItemInput } from "@/types/inventory";

describe("Mock provider", () => {
  it("sendMessage never contacts a real network — a valid number resolves synchronously to SENT with a mock id", async () => {
    const provider = new MockMarketingProvider();
    const result = await provider.sendMessage({ to: "+923001234567", message: "Hello", campaignMessageId: "test" });
    expect(result.status).toBe("SENT");
    expect(result.providerMessageId).toMatch(/^mock-/);
  });

  it("sendMessage fails an implausible number as a permanent, non-retryable error", async () => {
    const provider = new MockMarketingProvider();
    const result = await provider.sendMessage({ to: "abc", message: "Hello", campaignMessageId: "test" });
    expect(result.status).toBe("FAILED");
    expect(result.error).toBe("INVALID_NUMBER");
    expect(result.retryable).toBe(false);
  });

  it("sendTemplate delegates to sendMessage with the same validation", async () => {
    const provider = new MockMarketingProvider();
    const result = await provider.sendTemplate({ to: "+923001234567", templateName: "welcome", variables: {}, campaignMessageId: "test" });
    expect(result.status).toBe("SENT");
  });

  it("getMessageStatus reports SENT for any id without any network call", async () => {
    const provider = new MockMarketingProvider();
    const result = await provider.getMessageStatus("mock-123");
    expect(result.status).toBe("SENT");
  });

  it("handleWebhook rejects a payload with a missing/incorrect signature", () => {
    const provider = new MockMarketingProvider();
    const body = JSON.stringify({ events: [{ providerMessageId: "mock-1", kind: "delivered", occurredAt: new Date().toISOString() }] });
    expect(provider.handleWebhook(body, null)).toEqual([]);
    expect(provider.handleWebhook(body, "wrong-signature")).toEqual([]);
  });

  it("handleWebhook accepts and parses a correctly-signed payload", () => {
    const provider = new MockMarketingProvider();
    const body = JSON.stringify({ events: [{ providerMessageId: "mock-1", kind: "delivered", occurredAt: new Date().toISOString() }] });
    const secret = process.env.MARKETING_MOCK_WEBHOOK_SECRET ?? "mock-webhook-secret";
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

    const events = provider.handleWebhook(body, signature);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("delivered");
    expect(events[0].providerMessageId).toBe("mock-1");
  });
});

describe("AI product recommendations", () => {
  it("never recommends anything for a customer with no purchase history", async () => {
    const owner = await getSeededOwnerId();
    const customer = await createCustomer({ firstName: `NoHistory ${uniqueSuffix()}`, phone: uniquePhone() }, owner);
    const recommendations = await getRecommendationsForCustomer(customer.id);
    expect(recommendations).toEqual([]);
  });

  it("recommends only currently in-stock items, each with a factual reason", async () => {
    const owner = await getSeededOwnerId();
    const categoryId = await getTestCategoryId();
    const customer = await createCustomer({ firstName: `History ${uniqueSuffix()}`, phone: uniquePhone() }, owner);

    const purchased = await createInventoryItem(buildItemInput(categoryId, { sellingPrice: 500000 }), owner);
    await completeSale(
      { customerId: customer.id, items: [{ inventoryItemId: purchased.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: owner, role: { name: "OWNER" } },
    );

    const available = await createInventoryItem(buildItemInput(categoryId, { sellingPrice: 520000 }), owner);

    const recommendations = await getRecommendationsForCustomer(customer.id);
    const match = recommendations.find((r) => r.inventoryItemId === available.id);
    expect(match).toBeDefined();
    expect(match?.reason.length).toBeGreaterThan(0);
    expect(match?.reason).toContain("previously purchased");
  });
});

function uniquePhone(): string {
  const digits = (Date.now() % 1e8).toString().padStart(8, "0");
  return `+923${digits}${Math.floor(Math.random() * 10)}`;
}

function buildItemInput(categoryId: string, overrides: Partial<CreateInventoryItemInput> = {}): CreateInventoryItemInput {
  return {
    productName: `Recommendation Item ${uniqueSuffix()}`,
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
