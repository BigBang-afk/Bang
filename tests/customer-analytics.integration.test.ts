import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createInventoryItem } from "@/services/inventory-item.service";
import { completeSale } from "@/services/sale-transaction.service";
import { createCustomer } from "@/services/customer.service";
import { requestReturn, approveReturn } from "@/services/returns.service";
import { getSaleById } from "@/services/sale.service";
import {
  getCustomerLifetimeValue,
  computeCustomerSegments,
  getSegmentationConfig,
} from "@/services/customer-analytics.service";
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
  return `+92302${Date.now()}${uniqueSuffix().slice(0, 4)}`;
}

function buildItemInput(overrides: Partial<CreateInventoryItemInput> = {}): CreateInventoryItemInput {
  return {
    productName: `Analytics Test Item ${uniqueSuffix()}`,
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

async function createSellableItem(overrides: Partial<CreateInventoryItemInput> = {}) {
  return createInventoryItem(buildItemInput(overrides), userId);
}

describe("Sale association (Test 6)", () => {
  it("associates a completed sale with the selected customer, not a walk-in", async () => {
    const customer = await createCustomer({ firstName: `Assoc ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createSellableItem();
    const result = await completeSale(
      { items: [{ inventoryItemId: item.id }], customerId: customer.id, payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const sale = await getSaleById(result.id);
    expect(sale!.customer?.id).toBe(customer.id);
  });

  it("never creates a customer record for a walk-in sale", async () => {
    const item = await createSellableItem();
    const result = await completeSale(
      { items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    const sale = await getSaleById(result.id);
    expect(sale!.customer).toBeNull();
    expect(sale!.customerId).toBeNull();
  });
});

describe("Customer lifetime value & average purchase (Tests 7, 8)", () => {
  it("sums completed sales and computes average/highest/first/last purchase", async () => {
    const customer = await createCustomer({ firstName: `LTV ${uniqueSuffix()}`, phone: uniquePhone() }, userId);

    const itemA = await createSellableItem({ sellingPrice: 500000 });
    const itemB = await createSellableItem({ netWeight: 5, sellingPrice: 300000 });

    await completeSale(
      { items: [{ inventoryItemId: itemA.id }], customerId: customer.id, payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    await completeSale(
      { items: [{ inventoryItemId: itemB.id }], customerId: customer.id, payments: [{ method: "CASH", amount: 300000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const ltv = await getCustomerLifetimeValue(customer.id);
    expect(ltv.totalSpending).toBe("800000");
    expect(ltv.purchaseCount).toBe(2);
    expect(ltv.averagePurchaseValue).toBe("400000");
    expect(ltv.highestPurchase).toBe("500000");
    expect(ltv.firstPurchaseAt).not.toBeNull();
    expect(ltv.lastPurchaseAt).not.toBeNull();
  });

  it("returns zeroed values for a customer with no purchases", async () => {
    const customer = await createCustomer({ firstName: `NoPurchase ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const ltv = await getCustomerLifetimeValue(customer.id);
    expect(ltv.totalSpending).toBe("0");
    expect(ltv.purchaseCount).toBe(0);
    expect(ltv.firstPurchaseAt).toBeNull();
  });

  it("excludes a fully RETURNED sale from lifetime value (handles returns correctly)", async () => {
    const customer = await createCustomer({ firstName: `Returned ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createSellableItem({ sellingPrice: 500000 });
    const result = await completeSale(
      { items: [{ inventoryItemId: item.id }], customerId: customer.id, payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const sale = await getSaleById(result.id);
    const ret = await requestReturn(sale!.items[0].id, "Customer changed their mind", userId);
    await approveReturn(ret.id, userId);

    const ltv = await getCustomerLifetimeValue(customer.id);
    expect(ltv.totalSpending).toBe("0");
    expect(ltv.purchaseCount).toBe(0);
  });
});

describe("VIP calculation (Test 16)", () => {
  it("marks a customer VIP once total spending reaches the configured threshold, without changing customerType", async () => {
    const config = await getSegmentationConfig();
    const customer = await createCustomer({ firstName: `VipCalc ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createSellableItem({ sellingPrice: config.vipThreshold.toNumber() });

    await completeSale(
      { items: [{ inventoryItemId: item.id }], customerId: customer.id, payments: [{ method: "CASH", amount: config.vipThreshold.toNumber() }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const ltv = await getCustomerLifetimeValue(customer.id);
    const segments = computeCustomerSegments(
      { createdAt: new Date(), lastPurchaseAt: ltv.lastPurchaseAt, totalSpending: ltv.totalSpending, outstandingBalance: 0, purchaseCount: ltv.purchaseCount },
      config,
    );
    expect(segments).toContain("VIP");

    const row = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(row.customerType).toBe("REGULAR");
  });

  it("does not mark a low-spending customer as VIP", () => {
    const segments = computeCustomerSegments(
      { createdAt: new Date(2000, 0, 1), lastPurchaseAt: null, totalSpending: 1000, outstandingBalance: 0, purchaseCount: 5 },
      { vipThreshold: new Prisma.Decimal(2_000_000), inactivityDays: 90 },
    );
    expect(segments).not.toContain("VIP");
  });
});

describe("Inactive segmentation (Test 17)", () => {
  it("classifies a customer with no purchase for longer than the inactivity window as INACTIVE", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 200);

    const segments = computeCustomerSegments(
      { createdAt: oldDate, lastPurchaseAt: oldDate, totalSpending: 100000, outstandingBalance: 0, purchaseCount: 1 },
      { vipThreshold: new Prisma.Decimal(2_000_000), inactivityDays: 90 },
    );
    expect(segments).toContain("INACTIVE");
  });

  it("does not classify a recent purchaser as INACTIVE", () => {
    const recent = new Date();
    const segments = computeCustomerSegments(
      { createdAt: recent, lastPurchaseAt: recent, totalSpending: 100000, outstandingBalance: 0, purchaseCount: 1 },
      { vipThreshold: new Prisma.Decimal(2_000_000), inactivityDays: 90 },
    );
    expect(segments).not.toContain("INACTIVE");
  });

  it("classifies a customer who never purchased but was created long ago as INACTIVE", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 200);
    const segments = computeCustomerSegments(
      { createdAt: oldDate, lastPurchaseAt: null, totalSpending: 0, outstandingBalance: 0, purchaseCount: 0 },
      { vipThreshold: new Prisma.Decimal(2_000_000), inactivityDays: 90 },
    );
    expect(segments).toContain("INACTIVE");
  });

  it("does not mark a brand-new customer with zero purchases as inactive", () => {
    const segments = computeCustomerSegments(
      { createdAt: new Date(), lastPurchaseAt: null, totalSpending: 0, outstandingBalance: 0, purchaseCount: 0 },
      { vipThreshold: new Prisma.Decimal(2_000_000), inactivityDays: 90 },
    );
    expect(segments).not.toContain("INACTIVE");
    expect(segments).toContain("NEW_CUSTOMER");
  });
});

describe("Segmentation — CREDIT_CUSTOMER", () => {
  it("flags a customer with an outstanding balance as a credit customer", () => {
    const segments = computeCustomerSegments(
      { createdAt: new Date(2000, 0, 1), lastPurchaseAt: null, totalSpending: 0, outstandingBalance: 50000, purchaseCount: 1 },
      { vipThreshold: new Prisma.Decimal(2_000_000), inactivityDays: 90 },
    );
    expect(segments).toContain("CREDIT_CUSTOMER");
  });
});
