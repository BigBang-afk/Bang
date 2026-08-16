import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createInventoryItem,
  updateInventoryItem,
  changeInventoryItemStatus,
  archiveInventoryItem,
  getInventoryItemById,
  listInventoryItems,
  InvalidStatusTransitionError,
} from "@/services/inventory-item.service";
import { listStockMovementsForItem } from "@/services/stock-movement.service";
import { getTodayBusinessDate } from "@/lib/business-date";
import { formatBarcodeCode, parseBarcodeCode } from "@/lib/barcode-code";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";
import type { CreateInventoryItemInput } from "@/types/inventory";

let userId: string;
let categoryId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
  categoryId = await getTestCategoryId();
});

function buildInput(overrides: Partial<CreateInventoryItemInput> = {}): CreateInventoryItemInput {
  return {
    productName: `Integration Test Ring ${uniqueSuffix()}`,
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

describe("createInventoryItem — product & stock creation (Test 1)", () => {
  it("creates a Product and InventoryItem with correct calculated fields", async () => {
    const created = await createInventoryItem(
      buildInput({ makingCharge: 15000, stoneCharge: 5000, otherCharge: 2000 }),
      userId,
    );

    const item = await getInventoryItemById(created.id);
    expect(item).not.toBeNull();
    // Decimal.toString() normalizes away trailing zeros (e.g. "10.000" -> "10"),
    // which is exactly why display code goes through formatWeight/formatCurrency
    // instead — compare numeric value here, not the raw string form.
    expect(item!.netWeight.toNumber()).toBe(10);
    expect(item!.wastageWeight.toNumber()).toBe(0.5);
    expect(item!.grossWeight.toNumber()).toBe(10.5);
    expect(item!.goldValue.toNumber()).toBe(420000);
    expect(item!.totalCost.toNumber()).toBe(442000);
    expect(item!.status).toBe("IN_STOCK");
    expect(item!.archivedAt).toBeNull();
    expect(item!.createdBy.id).toBe(userId);
  });
});

describe("Barcode uniqueness and ZJ sequence generation (Tests 2 & 3)", () => {
  it("assigns a well-formed, unique ZJ-prefixed code on every create", async () => {
    const first = await createInventoryItem(buildInput(), userId);
    const second = await createInventoryItem(buildInput(), userId);

    expect(first.barcodeCode).toMatch(/^ZJ-\d{6,}$/);
    expect(second.barcodeCode).toMatch(/^ZJ-\d{6,}$/);
    expect(first.barcodeCode).not.toBe(second.barcodeCode);

    const firstSeq = parseBarcodeCode(first.barcodeCode)!;
    const secondSeq = parseBarcodeCode(second.barcodeCode)!;
    expect(secondSeq).toBeGreaterThan(firstSeq);
  });

  it("never produces a duplicate sequence under concurrent creation", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => createInventoryItem(buildInput(), userId)),
    );

    const sequences = results.map((r) => parseBarcodeCode(r.barcodeCode));
    const uniqueSequences = new Set(sequences);
    expect(uniqueSequences.size).toBe(results.length);
  });

  it("is backed by a real unique database constraint on Barcode.sequence", async () => {
    const created = await createInventoryItem(buildInput(), userId);
    const barcode = await prisma.barcode.findUniqueOrThrow({
      where: { inventoryItemId: created.id },
    });
    expect(formatBarcodeCode(barcode.sequence)).toBe(created.barcodeCode);

    await expect(
      prisma.barcode.create({
        data: { sequence: barcode.sequence, inventoryItemId: created.id },
      }),
    ).rejects.toThrow();
  });
});

describe("Stock status transitions (Test 12) and stock movements (Test 13)", () => {
  it("records a STOCK_CREATED movement on creation", async () => {
    const created = await createInventoryItem(buildInput(), userId);
    const movements = await listStockMovementsForItem(created.id);
    expect(movements).toHaveLength(1);
    expect(movements[0].movementType).toBe("STOCK_CREATED");
    expect(movements[0].newStatus).toBe("IN_STOCK");
  });

  it("allows a valid transition (IN_STOCK -> RESERVED -> SOLD) and records movements", async () => {
    const created = await createInventoryItem(buildInput(), userId);

    await changeInventoryItemStatus(created.id, "RESERVED", userId, "Customer holding it");
    let item = await getInventoryItemById(created.id);
    expect(item!.status).toBe("RESERVED");

    await changeInventoryItemStatus(created.id, "SOLD", userId);
    item = await getInventoryItemById(created.id);
    expect(item!.status).toBe("SOLD");

    const movements = await listStockMovementsForItem(created.id);
    expect(movements.map((m) => m.movementType)).toEqual(
      expect.arrayContaining(["STOCK_CREATED", "STOCK_RESERVED", "STOCK_SOLD"]),
    );
  });

  it("rejects an invalid status transition", async () => {
    const created = await createInventoryItem(buildInput(), userId);
    await changeInventoryItemStatus(created.id, "SOLD", userId);

    // SOLD -> DAMAGED is not an allowed transition (SOLD can only -> RETURNED).
    await expect(changeInventoryItemStatus(created.id, "DAMAGED", userId)).rejects.toThrow(
      InvalidStatusTransitionError,
    );
  });
});

describe("Historical gold-rate snapshot (Test 15)", () => {
  it("preserves the original cost gold rate after the daily rate changes", async () => {
    const businessDate = getTodayBusinessDate();

    const originalRate = await prisma.goldRate.create({
      data: { businessDate, purity: "K21", ratePerGram: "40000.00", createdById: userId },
    });

    const created = await createInventoryItem(
      buildInput({ purity: "K21", goldRate: 40000 }),
      userId,
    );

    let item = await getInventoryItemById(created.id);
    expect(item!.goldRatePerGram.toNumber()).toBe(40000);
    expect(item!.goldRateSource?.id).toBe(originalRate.id);

    // Simulate a same-day correction — a newer, higher effective rate for K21.
    await prisma.goldRate.create({
      data: { businessDate, purity: "K21", ratePerGram: "45000.00", createdById: userId },
    });

    // The existing stock record must NOT change even though today's effective rate did.
    item = await getInventoryItemById(created.id);
    expect(item!.goldRatePerGram.toNumber()).toBe(40000);
  });

  it("leaves goldRateSourceId null when the rate was manually overridden", async () => {
    const created = await createInventoryItem(
      buildInput({ purity: "K18", goldRate: 12345.67 }),
      userId,
    );
    const item = await getInventoryItemById(created.id);
    expect(item!.goldRatePerGram.toString()).toBe("12345.67");
    expect(item!.goldRateSource).toBeNull();
  });
});

describe("Soft deletion / archive (Test 16)", () => {
  it("archives without deleting the row, barcode, or history", async () => {
    const created = await createInventoryItem(buildInput(), userId);

    await archiveInventoryItem(created.id, userId, "Damaged beyond repair, removing from shelf");

    const item = await getInventoryItemById(created.id);
    expect(item).not.toBeNull();
    expect(item!.archivedAt).not.toBeNull();
    expect(item!.barcode).not.toBeNull();

    const movements = await listStockMovementsForItem(created.id);
    expect(movements.some((m) => m.movementType === "STOCK_ARCHIVED")).toBe(true);
  });

  it("excludes archived items from the default (active) listing", async () => {
    const marker = `ArchiveSearch-${uniqueSuffix()}`;
    const created = await createInventoryItem(buildInput({ productName: marker }), userId);
    await archiveInventoryItem(created.id, userId);

    const activeOnly = await listInventoryItems({ search: marker });
    expect(activeOnly.rows.find((r) => r.id === created.id)).toBeUndefined();

    const includingArchived = await listInventoryItems({ search: marker, includeArchived: true });
    expect(includingArchived.rows.find((r) => r.id === created.id)).toBeDefined();
  });
});

describe("Search (Test 17)", () => {
  it("finds an item by exact barcode", async () => {
    const created = await createInventoryItem(buildInput(), userId);
    const { rows } = await listInventoryItems({ search: created.barcodeCode });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(created.id);
  });

  it("finds an item by (partial, case-insensitive) product name", async () => {
    const marker = `Peacock Necklace ${uniqueSuffix()}`;
    const created = await createInventoryItem(buildInput({ productName: marker }), userId);
    const { rows } = await listInventoryItems({ search: "peacock necklace" });
    expect(rows.some((r) => r.id === created.id)).toBe(true);
  });

  it("finds an item by supplier", async () => {
    const supplier = `Supplier-${uniqueSuffix()}`;
    const created = await createInventoryItem(buildInput({ supplier }), userId);
    const { rows } = await listInventoryItems({ supplier });
    expect(rows.some((r) => r.id === created.id)).toBe(true);
  });
});

describe("Pagination (Test 18)", () => {
  it("paginates results consistently across pages", async () => {
    const marker = `PagingCategory-${uniqueSuffix()}`;
    const productNames = Array.from({ length: 5 }, () => `${marker} Item ${uniqueSuffix()}`);

    for (const productName of productNames) {
      await createInventoryItem(buildInput({ productName }), userId);
    }

    const pageSize = 2;
    const seen = new Set<string>();
    let total = 0;

    for (let page = 1; page <= 3; page++) {
      const result = await listInventoryItems({ search: marker, page, pageSize });
      total = result.total;
      for (const row of result.rows) seen.add(row.id);
      if (page < 3) expect(result.rows).toHaveLength(pageSize);
    }

    expect(total).toBe(5);
    expect(seen.size).toBe(5);
  });
});

describe("Financial edit history (before/after tracking)", () => {
  it("records a StockMovement and preserves before/after values when the selling price changes", async () => {
    const created = await createInventoryItem(buildInput({ sellingPrice: 500000 }), userId);
    const item = await getInventoryItemById(created.id);

    await updateInventoryItem(
      {
        ...buildInput({ sellingPrice: 550000 }),
        productName: item!.product.name,
        categoryId: item!.product.categoryId,
        id: created.id,
      },
      userId,
    );

    const movements = await listStockMovementsForItem(created.id);
    const updateMovement = movements.find((m) => m.movementType === "STOCK_UPDATED");
    expect(updateMovement).toBeDefined();

    const metadata = updateMovement!.metadata as { changes: Record<string, { before: string; after: string }> };
    expect(metadata.changes.sellingPrice.before).toBe("Rs. 500,000");
    expect(metadata.changes.sellingPrice.after).toBe("Rs. 550,000");
  });
});
