import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createInventoryItem, getInventoryItemById, getInventoryItemByBarcode, searchInventoryForSale } from "@/services/inventory-item.service";
import { listStockMovementsForItem } from "@/services/stock-movement.service";
import { completeSale, InventoryUnavailableError, CustomerNotFoundError } from "@/services/sale-transaction.service";
import { SalePricingError } from "@/services/sale-pricing.service";
import { getSaleById } from "@/services/sale.service";
import { setMaxDiscountPercentForRole } from "@/services/sales-settings.service";
import { createCustomer } from "@/services/customer.service";
import { requestReturn, approveReturn, ReturnAlreadyExistsError } from "@/services/returns.service";
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
    productName: `POS Test Item ${uniqueSuffix()}`,
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

describe("Barcode lookup & product search (Tests 1 & 2)", () => {
  it("finds an item by exact barcode scan", async () => {
    const created = await createSellableItem();
    const found = await getInventoryItemByBarcode(created.barcodeCode);
    expect(found?.id).toBe(created.id);
  });

  it("returns null for a barcode that does not exist", async () => {
    const found = await getInventoryItemByBarcode("ZJ-999999");
    expect(found).toBeNull();
  });

  it("finds a sellable item by product name and excludes non-IN_STOCK items", async () => {
    const marker = `Searchable Bangle ${uniqueSuffix()}`;
    const created = await createSellableItem({ productName: marker });
    let results = await searchInventoryForSale(marker);
    expect(results.some((r) => r.inventoryItemId === created.id)).toBe(true);

    await completeSale(
      {
        items: [{ inventoryItemId: created.id }],
        payments: [{ method: "CASH", amount: 500000 }],
      },
      { id: userId, role: { name: "OWNER" } },
    );

    results = await searchInventoryForSale(marker);
    expect(results.some((r) => r.inventoryItemId === created.id)).toBe(false);
  });
});

describe("Critical integration test — scan, sell, and verify every side effect", () => {
  it("scanning an IN_STOCK item and completing a sale creates Sale, Invoice, Payment, marks inventory SOLD, records STOCK_SOLD, and writes an audit log", async () => {
    const created = await createSellableItem();
    const scanned = await getInventoryItemByBarcode(created.barcodeCode);
    expect(scanned?.status).toBe("IN_STOCK");

    const result = await completeSale(
      {
        items: [{ inventoryItemId: created.id }],
        payments: [{ method: "CASH", amount: 500000 }],
      },
      { id: userId, role: { name: "OWNER" } },
    );

    expect(result.invoiceNumber).toMatch(/^ZJ-INV-\d{6,}$/);
    expect(result.grandTotal).toBe("500000");

    const sale = await getSaleById(result.id);
    expect(sale).not.toBeNull();
    expect(sale!.items).toHaveLength(1);
    expect(sale!.payments).toHaveLength(1);
    expect(sale!.invoice).not.toBeNull();

    const item = await getInventoryItemById(created.id);
    expect(item!.status).toBe("SOLD");

    const movements = await listStockMovementsForItem(created.id);
    const soldMovement = movements.find((m) => m.movementType === "STOCK_SOLD");
    expect(soldMovement).toBeDefined();

    const auditLogs = await prisma.auditLog.findMany({
      where: { entity: "Sale", entityId: result.id, action: "SALE_COMPLETED" },
    });
    expect(auditLogs).toHaveLength(1);
  });
});

describe("Cart validation (Tests 3 & 4)", () => {
  it("rejects a cart containing the same item twice", async () => {
    const created = await createSellableItem();
    await expect(
      completeSale(
        {
          items: [{ inventoryItemId: created.id }, { inventoryItemId: created.id }],
          payments: [{ method: "CASH", amount: 1000000 }],
        },
        { id: userId, role: { name: "OWNER" } },
      ),
    ).rejects.toThrow(SalePricingError);
  });

  it("rejects an empty cart", async () => {
    await expect(
      completeSale({ items: [], payments: [] }, { id: userId, role: { name: "OWNER" } }),
    ).rejects.toThrow(SalePricingError);
  });

  it("rejects an item that is already SOLD", async () => {
    const created = await createSellableItem();
    await completeSale(
      { items: [{ inventoryItemId: created.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    await expect(
      completeSale(
        { items: [{ inventoryItemId: created.id }], payments: [{ method: "CASH", amount: 500000 }] },
        { id: userId, role: { name: "OWNER" } },
      ),
    ).rejects.toThrow(InventoryUnavailableError);
  });
});

describe("Discount calculation & permission (Tests 5 & 6)", () => {
  it("applies a percentage discount and rejects a discount beyond the role's configured maximum", async () => {
    const role = `TEST_CASHIER_${uniqueSuffix()}`;
    await setMaxDiscountPercentForRole(role, 10, userId);

    const withinLimit = await createSellableItem();
    const result = await completeSale(
      {
        items: [{ inventoryItemId: withinLimit.id, discountType: "PERCENTAGE", discountValue: 10 }],
        payments: [{ method: "CASH", amount: 450000 }],
      },
      { id: userId, role: { name: role } },
    );
    expect(result.grandTotal).toBe("450000");

    const overLimit = await createSellableItem();
    await expect(
      completeSale(
        {
          items: [{ inventoryItemId: overLimit.id, discountType: "PERCENTAGE", discountValue: 20 }],
          payments: [{ method: "CASH", amount: 400000 }],
        },
        { id: userId, role: { name: role } },
      ),
    ).rejects.toThrow(SalePricingError);

    // The rejected item must remain IN_STOCK — no partial side effects.
    const stillInStock = await getInventoryItemById(overLimit.id);
    expect(stillInStock!.status).toBe("IN_STOCK");
  });

  it("OWNER is never capped by a configured role limit", async () => {
    const created = await createSellableItem();
    const result = await completeSale(
      {
        items: [{ inventoryItemId: created.id, discountType: "PERCENTAGE", discountValue: 90 }],
        payments: [{ method: "CASH", amount: 50000 }],
      },
      { id: userId, role: { name: "OWNER" } },
    );
    expect(result.grandTotal).toBe("50000");
  });
});

describe("Payment calculation — partial, full, and credit sales (Tests 7, 8, 9, 10)", () => {
  it("accepts a fully paid cash sale with balance 0", async () => {
    const created = await createSellableItem();
    const result = await completeSale(
      { items: [{ inventoryItemId: created.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    const sale = await getSaleById(result.id);
    expect(sale!.balanceAmount.toString()).toBe("0");
    expect(sale!.paidAmount.toString()).toBe("500000");
  });

  it("splits Cash + Bank + Credit across multiple payment lines and requires a customer for the credit portion", async () => {
    const customer = await createCustomer(
      { name: `Credit Customer ${uniqueSuffix()}`, phone: `+92300${uniqueSuffix()}` },
      userId,
    );
    const created = await createSellableItem();

    const result = await completeSale(
      {
        items: [{ inventoryItemId: created.id }],
        customerId: customer.id,
        payments: [
          { method: "CASH", amount: 200000 },
          { method: "BANK_TRANSFER", amount: 200000 },
          { method: "CREDIT", amount: 100000 },
        ],
      },
      { id: userId, role: { name: "OWNER" } },
    );

    const sale = await getSaleById(result.id);
    expect(sale!.paidAmount.toString()).toBe("400000");
    expect(sale!.balanceAmount.toString()).toBe("100000");

    const updatedCustomer = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(updatedCustomer.outstandingBalance.toString()).toBe("100000");
  });

  it("rejects a credit sale with no customer selected (walk-in sales must be paid in full)", async () => {
    const created = await createSellableItem();
    await expect(
      completeSale(
        { items: [{ inventoryItemId: created.id }], payments: [{ method: "CREDIT", amount: 500000 }] },
        { id: userId, role: { name: "OWNER" } },
      ),
    ).rejects.toThrow(SalePricingError);
  });

  it("rejects payments that don't sum to the grand total", async () => {
    const created = await createSellableItem();
    await expect(
      completeSale(
        { items: [{ inventoryItemId: created.id }], payments: [{ method: "CASH", amount: 400000 }] },
        { id: userId, role: { name: "OWNER" } },
      ),
    ).rejects.toThrow(SalePricingError);
  });

  it("rejects an unknown customer id", async () => {
    const created = await createSellableItem();
    await expect(
      completeSale(
        {
          items: [{ inventoryItemId: created.id }],
          customerId: "00000000-0000-0000-0000-000000000000",
          payments: [{ method: "CASH", amount: 500000 }],
        },
        { id: userId, role: { name: "OWNER" } },
      ),
    ).rejects.toThrow(CustomerNotFoundError);
  });
});

describe("Invoice number uniqueness (Test 11)", () => {
  it("never produces a duplicate invoice number under concurrent sales", async () => {
    const items = await Promise.all(Array.from({ length: 6 }, () => createSellableItem()));

    const results = await Promise.all(
      items.map((item) =>
        completeSale(
          { items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 500000 }] },
          { id: userId, role: { name: "OWNER" } },
        ),
      ),
    );

    const invoiceNumbers = results.map((r) => r.invoiceNumber);
    expect(new Set(invoiceNumbers).size).toBe(invoiceNumbers.length);
  });
});

describe("Historical pricing snapshot (Test 15 for sales)", () => {
  it("does not let a later gold-rate change affect an already-sold item's recorded sale price", async () => {
    const created = await createSellableItem({ purity: "K21", goldRate: 40000 });
    const result = await completeSale(
      { items: [{ inventoryItemId: created.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    await prisma.goldRate.create({
      data: {
        businessDate: new Date(),
        purity: "K21",
        ratePerGram: "99999.00",
        createdById: userId,
      },
    });

    const sale = await getSaleById(result.id);
    expect(sale!.items[0].goldRatePerGram.toNumber()).toBe(40000);
    expect(sale!.grandTotal.toString()).toBe("500000");
  });
});

describe("Double-submit protection (Test 18)", () => {
  it("a second identical checkout attempt for the same cart fails cleanly", async () => {
    const created = await createSellableItem();
    const input = {
      items: [{ inventoryItemId: created.id }],
      payments: [{ method: "CASH" as const, amount: 500000 }],
    };

    const [first, second] = await Promise.allSettled([
      completeSale(input, { id: userId, role: { name: "OWNER" } }),
      completeSale(input, { id: userId, role: { name: "OWNER" } }),
    ]);

    const outcomes = [first, second];
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((o) => o.status === "rejected")).toHaveLength(1);

    const rejected = outcomes.find((o) => o.status === "rejected");
    expect((rejected as PromiseRejectedResult).reason).toBeInstanceOf(InventoryUnavailableError);

    const saleCount = await prisma.saleItem.count({ where: { inventoryItemId: created.id } });
    expect(saleCount).toBe(1);
  });
});

describe("Concurrency protection — two cashiers, one item", () => {
  it("only one of many simultaneous sale attempts for the same unique item succeeds", async () => {
    const created = await createSellableItem();
    const attempts = 5;

    const outcomes = await Promise.allSettled(
      Array.from({ length: attempts }, () =>
        completeSale(
          { items: [{ inventoryItemId: created.id }], payments: [{ method: "CASH", amount: 500000 }] },
          { id: userId, role: { name: "OWNER" } },
        ),
      ),
    );

    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    const rejected = outcomes.filter((o) => o.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(attempts - 1);
    for (const r of rejected) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(InventoryUnavailableError);
    }

    const movements = await listStockMovementsForItem(created.id);
    expect(movements.filter((m) => m.movementType === "STOCK_SOLD")).toHaveLength(1);
  });
});

describe("Returns foundation (Test 17)", () => {
  it("requesting a return does not change inventory status", async () => {
    const created = await createSellableItem();
    const result = await completeSale(
      { items: [{ inventoryItemId: created.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    const sale = await getSaleById(result.id);
    const saleItemId = sale!.items[0].id;

    await requestReturn(saleItemId, "Customer changed their mind", userId);

    const item = await getInventoryItemById(created.id);
    expect(item!.status).toBe("SOLD");
  });

  it("rejects a duplicate return request for the same sale item", async () => {
    const created = await createSellableItem();
    const result = await completeSale(
      { items: [{ inventoryItemId: created.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    const sale = await getSaleById(result.id);
    const saleItemId = sale!.items[0].id;

    await requestReturn(saleItemId, "First request", userId);
    await expect(requestReturn(saleItemId, "Second request", userId)).rejects.toThrow(
      ReturnAlreadyExistsError,
    );
  });

  it("approving a return moves inventory SOLD -> RETURNED and marks the sale RETURNED", async () => {
    const created = await createSellableItem();
    const result = await completeSale(
      { items: [{ inventoryItemId: created.id }], payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    const sale = await getSaleById(result.id);
    const saleItemId = sale!.items[0].id;

    const ret = await requestReturn(saleItemId, "Defective", userId);
    await approveReturn(ret.id, userId);

    const item = await getInventoryItemById(created.id);
    expect(item!.status).toBe("RETURNED");

    const updatedSale = await getSaleById(result.id);
    expect(updatedSale!.status).toBe("RETURNED");

    const movements = await listStockMovementsForItem(created.id);
    expect(movements.some((m) => m.movementType === "STOCK_RETURNED")).toBe(true);
  });
});
