import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createSupplier } from "@/services/supplier.service";
import {
  createPurchase,
  getPurchaseById,
  SupplierNotFoundForPurchaseError,
  EmptyPurchaseError,
  PurchaseOverpaymentError,
  MissingSellingPriceError,
} from "@/services/purchase.service";
import { getPartyCashPosition } from "@/services/party-cash-ledger.service";
import { parsePurchaseNumber, formatPurchaseNumber } from "@/lib/purchase-number";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;
let categoryId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
  categoryId = await getTestCategoryId();
});

function uniquePhone(prefix: string): string {
  return `+9233${prefix}${Date.now()}${uniqueSuffix().slice(0, 4)}`;
}

async function makeSupplier(tag: string) {
  return createSupplier({ name: `Purchase Supplier ${tag} ${uniqueSuffix()}`, phone: uniquePhone(tag) }, userId);
}

describe("Supplier purchase (Test 13)", () => {
  it("computes gold value/weight via the calculation engine and totals correctly", async () => {
    const supplier = await makeSupplier("A");
    const result = await createPurchase(
      {
        supplierId: supplier.id,
        items: [
          {
            productName: "Bridal Ring",
            purity: "K21",
            netWeight: 10,
            goldRate: 40000,
            wastageType: "PERCENTAGE",
            wastagePercent: 5,
            makingCharge: 15000,
            stoneCharge: 5000,
            addToInventory: false,
          },
        ],
        payments: [],
      },
      userId,
    );

    expect(result.purchaseNumber).toMatch(/^ZJ-PUR-\d{6}$/);

    const purchase = await getPurchaseById(result.purchaseId);
    // netWeight 10 * 1.05 = 10.5 gross; goldValue = 10.5 * 40000 = 420,000
    expect(purchase!.items[0].goldValue.toNumber()).toBe(420000);
    expect(purchase!.subtotal.toNumber()).toBe(420000);
    expect(purchase!.totalCharges.toNumber()).toBe(20000);
    expect(purchase!.grandTotal.toNumber()).toBe(440000);
    expect(purchase!.paidAmount.toNumber()).toBe(0);
    expect(purchase!.balanceAmount.toNumber()).toBe(440000);
  });

  it("rejects a purchase with no items", async () => {
    const supplier = await makeSupplier("B");
    await expect(
      createPurchase({ supplierId: supplier.id, items: [], payments: [] }, userId),
    ).rejects.toThrow(EmptyPurchaseError);
  });

  it("rejects payments exceeding the grand total", async () => {
    const supplier = await makeSupplier("C");
    await expect(
      createPurchase(
        {
          supplierId: supplier.id,
          items: [
            {
              productName: "Chain",
              purity: "K22",
              netWeight: 5,
              goldRate: 42000,
              wastageType: "FIXED_GRAMS",
              wastageGrams: 0,
              addToInventory: false,
            },
          ],
          payments: [{ amount: 999999, method: "CASH" }],
        },
        userId,
      ),
    ).rejects.toThrow(PurchaseOverpaymentError);
  });

  it("requires a selling price when addToInventory is true", async () => {
    const supplier = await makeSupplier("D");
    await expect(
      createPurchase(
        {
          supplierId: supplier.id,
          items: [
            {
              productName: "Bangle",
              purity: "K21",
              netWeight: 8,
              goldRate: 40000,
              wastageType: "PERCENTAGE",
              wastagePercent: 5,
              addToInventory: true,
            },
          ],
          payments: [],
        },
        userId,
      ),
    ).rejects.toThrow(MissingSellingPriceError);
  });

  it("writes a PURCHASE_CREATED audit log", async () => {
    const supplier = await makeSupplier("E");
    const result = await createPurchase(
      {
        supplierId: supplier.id,
        items: [
          { productName: "Earrings", purity: "K18", netWeight: 4, goldRate: 30000, wastageType: "PERCENTAGE", wastagePercent: 5, addToInventory: false },
        ],
        payments: [],
      },
      userId,
    );
    const logs = await prisma.auditLog.findMany({
      where: { entity: "Purchase", entityId: result.purchaseId, action: "PURCHASE_CREATED" },
    });
    expect(logs).toHaveLength(1);
  });
});

describe("Purchase number uniqueness", () => {
  it("assigns unique, increasing ZJ-PUR- numbers, never confused with ZJ-INV-", async () => {
    const supplier = await makeSupplier("F");
    const item = {
      productName: "Pendant",
      purity: "K21" as const,
      netWeight: 3,
      goldRate: 40000,
      wastageType: "PERCENTAGE" as const,
      wastagePercent: 5,
      addToInventory: false,
    };
    const first = await createPurchase({ supplierId: supplier.id, items: [item], payments: [] }, userId);
    const second = await createPurchase({ supplierId: supplier.id, items: [item], payments: [] }, userId);

    expect(parsePurchaseNumber(first.purchaseNumber)).toBeLessThan(parsePurchaseNumber(second.purchaseNumber)!);
    expect(parsePurchaseNumber("ZJ-INV-000001")).toBeNull();
    expect(formatPurchaseNumber(1)).toBe("ZJ-PUR-000001");
  });
});

describe("Supplier payable (Test 14) posted from a purchase", () => {
  it("full grand total is debited, then paidAmount is credited, matching balanceAmount", async () => {
    const supplier = await makeSupplier("G");
    const result = await createPurchase(
      {
        supplierId: supplier.id,
        items: [
          { productName: "Necklace", purity: "K21", netWeight: 12, goldRate: 40000, wastageType: "PERCENTAGE", wastagePercent: 5, addToInventory: false },
        ],
        payments: [{ amount: 200000, method: "CASH" }],
      },
      userId,
    );

    const purchase = await getPurchaseById(result.purchaseId);
    const position = await getPartyCashPosition("SUPPLIER", supplier.id);
    expect(position.payable).toBe(purchase!.balanceAmount.toString());
  });
});

describe("Inventory integration (Test 19)", () => {
  it("addToInventory pushes a purchase item into inventory as source PURCHASED, linked to the supplier and purchase item", async () => {
    const supplier = await makeSupplier("H");
    const result = await createPurchase(
      {
        supplierId: supplier.id,
        items: [
          {
            productName: "Purchased Ring",
            categoryId,
            purity: "K21",
            netWeight: 5,
            goldRate: 40000,
            wastageType: "PERCENTAGE",
            wastagePercent: 5,
            addToInventory: true,
            sellingPrice: 300000,
          },
        ],
        payments: [],
      },
      userId,
    );

    const purchase = await getPurchaseById(result.purchaseId);
    const purchaseItem = purchase!.items[0];
    expect(purchaseItem.inventoryItem).not.toBeNull();

    const inventoryItem = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: purchaseItem.inventoryItem!.id },
    });
    expect(inventoryItem.source).toBe("PURCHASED");
    expect(inventoryItem.supplierId).toBe(supplier.id);
    expect(inventoryItem.purchaseItemId).toBe(purchaseItem.id);
    expect(inventoryItem.status).toBe("IN_STOCK");

    // A barcode was generated exactly like a manufactured item.
    const barcode = await prisma.barcode.findUnique({ where: { inventoryItemId: inventoryItem.id } });
    expect(barcode).not.toBeNull();

    const auditLogs = await prisma.auditLog.findMany({ where: { entity: "InventoryItem", entityId: inventoryItem.id } });
    expect(auditLogs.some((l) => l.action === "STOCK_CREATED")).toBe(true);
  });

  it("addToInventory=false never creates an InventoryItem for that line", async () => {
    const supplier = await makeSupplier("I");
    const result = await createPurchase(
      {
        supplierId: supplier.id,
        items: [
          { productName: "Loose Gold", purity: "K24", netWeight: 20, goldRate: 45000, wastageType: "FIXED_GRAMS", wastageGrams: 0, addToInventory: false },
        ],
        payments: [],
      },
      userId,
    );
    const purchase = await getPurchaseById(result.purchaseId);
    expect(purchase!.items[0].inventoryItem).toBeNull();
  });
});

describe("Transaction rollback (Test 20)", () => {
  it("a purchase for a non-existent supplier creates no Purchase row at all", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const before = await prisma.purchase.count();
    await expect(
      createPurchase(
        {
          supplierId: fakeId,
          items: [{ productName: "X", purity: "K21", netWeight: 1, goldRate: 40000, wastageType: "PERCENTAGE", wastagePercent: 5, addToInventory: false }],
          payments: [],
        },
        userId,
      ),
    ).rejects.toThrow(SupplierNotFoundForPurchaseError);
    const after = await prisma.purchase.count();
    expect(after).toBe(before);
  });

  it("a multi-item purchase where one item fails validation creates no rows for any item", async () => {
    const supplier = await makeSupplier("J");
    const before = await prisma.purchaseItem.count();
    await expect(
      createPurchase(
        {
          supplierId: supplier.id,
          items: [
            { productName: "Valid Item", purity: "K21", netWeight: 5, goldRate: 40000, wastageType: "PERCENTAGE", wastagePercent: 5, addToInventory: false },
            { productName: "Invalid — no selling price", purity: "K21", netWeight: 5, goldRate: 40000, wastageType: "PERCENTAGE", wastagePercent: 5, addToInventory: true },
          ],
          payments: [],
        },
        userId,
      ),
    ).rejects.toThrow(MissingSellingPriceError);
    const after = await prisma.purchaseItem.count();
    expect(after).toBe(before);
  });
});
