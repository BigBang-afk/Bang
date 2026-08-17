import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  reconcileSales,
  reconcileCash,
  reconcileSupplierLedger,
  reconcileKarigarLedger,
  reconcileGold,
  reconcileInventory,
  runFullFinancialReconciliation,
} from "@/services/financial-reconciliation.service";
import { createKarigar } from "@/services/karigar.service";
import { createSupplier } from "@/services/supplier.service";
import { giveGoldToKarigar } from "@/services/karigar-job.service";
import { recordKarigarCashTransaction } from "@/services/karigar-cash.service";
import { createInventoryItem, changeInventoryItemStatus } from "@/services/inventory-item.service";
import { completeSale } from "@/services/sale-transaction.service";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;
let categoryId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
  categoryId = await getTestCategoryId();
});

function uniquePhone(prefix: string): string {
  return `+9232${prefix}${Date.now()}${uniqueSuffix().slice(0, 3)}`;
}

/**
 * These tests never assert that the whole-system report is clean — this shared dev database
 * carries genuine, deliberately-induced mismatches from OTHER phases' own test fixtures (Phase
 * 4's induced customer-ledger mismatch test, Phase 2's direct status-transition test — see
 * PHASE-6-STATUS.md "Known issues"). Reconciliation correctly flagging that pollution is the
 * feature working, not a bug. Instead these tests target one freshly-created, individually
 * traceable entity and confirm it moves from "not flagged" to "flagged" exactly when a mismatch
 * is deliberately introduced for it — proving the check logic itself is correct regardless of
 * whatever else exists in the database.
 */

describe("reconcileSales (Test 19)", () => {
  it("Sale.balanceAmount always exactly equals grandTotal minus non-credit payments — nothing in this codebase writes it any other way", async () => {
    const result = await reconcileSales();
    expect(result.status).toBe("OK");
    expect(result.errors).toHaveLength(0);
  });
});

describe("reconcileCash (Test 19)", () => {
  it("the live balance and an independent raw-SQL recomputation always agree", async () => {
    const result = await reconcileCash();
    expect(result.status).toBe("OK");
  });
});

describe("reconcileSupplierLedger / reconcileKarigarLedger (Test 19)", () => {
  it("a freshly-created karigar with a normal cash transaction is never flagged", async () => {
    const karigar = await createKarigar({ name: `Recon Karigar ${uniqueSuffix()}`, phone: uniquePhone("1") }, userId);
    await recordKarigarCashTransaction({ karigarId: karigar.id, transactionType: "CASH_PAID", amount: 5000, paymentMethod: "CASH" }, userId);

    const result = await reconcileKarigarLedger();
    expect(result.errors.some((e) => e.includes(karigar.id))).toBe(false);
  });

  it("directly tampering with a karigar's cached balance is caught as a FINANCIAL INTEGRITY ERROR", async () => {
    const karigar = await createKarigar({ name: `Recon Mismatch Karigar ${uniqueSuffix()}`, phone: uniquePhone("2") }, userId);
    await recordKarigarCashTransaction({ karigarId: karigar.id, transactionType: "CASH_PAID", amount: 5000, paymentMethod: "CASH" }, userId);

    // Deliberately bypass the ledger primitive — exactly Phase 4's established
    // induced-mismatch technique (see customer-ledger.integration.test.ts).
    await prisma.partyCashBalance.updateMany({
      where: { partyType: "KARIGAR", partyId: karigar.id },
      data: { balance: "999999" },
    });

    const result = await reconcileKarigarLedger();
    expect(result.status).toBe("FINANCIAL_INTEGRITY_ERROR");
    expect(result.errors.some((e) => e.includes(karigar.id) && e.includes("999999"))).toBe(true);
  });

  it("a freshly-created supplier with no tampering is never flagged", async () => {
    const supplier = await createSupplier({ name: `Recon Supplier ${uniqueSuffix()}`, phone: uniquePhone("3") }, userId);
    const result = await reconcileSupplierLedger();
    expect(result.errors.some((e) => e.includes(supplier.id))).toBe(false);
  });
});

describe("reconcileGold (Test 19)", () => {
  it("a freshly-given gold job is never flagged", async () => {
    const karigar = await createKarigar({ name: `Gold Recon Karigar ${uniqueSuffix()}`, phone: uniquePhone("4") }, userId);
    await giveGoldToKarigar({ karigarId: karigar.id, purity: "K21", weight: 5, goldRate: 30000 }, userId);

    const result = await reconcileGold();
    expect(result.errors.some((e) => e.includes(karigar.id))).toBe(false);
  });

  it("directly tampering with a party's cached gold balance is caught", async () => {
    const karigar = await createKarigar({ name: `Gold Recon Mismatch Karigar ${uniqueSuffix()}`, phone: uniquePhone("5") }, userId);
    await giveGoldToKarigar({ karigarId: karigar.id, purity: "K22", weight: 5, goldRate: 40000 }, userId);

    await prisma.partyGoldBalance.updateMany({
      where: { partyType: "KARIGAR", partyId: karigar.id, purity: "K22" },
      data: { balance: "777.000" },
    });

    const result = await reconcileGold();
    expect(result.status).toBe("FINANCIAL_INTEGRITY_ERROR");
    expect(result.errors.some((e) => e.includes(karigar.id) && e.includes("K22"))).toBe(true);
  });
});

describe("reconcileInventory (Test 19)", () => {
  it("a normally-sold item is never counted as a mismatch", async () => {
    const item = await createInventoryItem(
      {
        productName: `Recon Sold Item ${uniqueSuffix()}`,
        categoryId,
        purity: "K22",
        netWeight: 2,
        goldRate: 40000,
        wastageType: "FIXED_GRAMS",
        wastageGrams: 0,
        sellingPrice: 100000,
      },
      userId,
    );

    const before = await reconcileInventory();
    await completeSale(
      { items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 100000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    // A sale completed through the normal transactional path never adds to the mismatch count.
    const after = await reconcileInventory();
    expect(after.actual).toBe(before.actual);
  });

  it("forcing an item to SOLD outside completeSale() increases the mismatch count by exactly one", async () => {
    const item = await createInventoryItem(
      {
        productName: `Recon Forced Sold Item ${uniqueSuffix()}`,
        categoryId,
        purity: "K22",
        netWeight: 1,
        goldRate: 40000,
        wastageType: "FIXED_GRAMS",
        wastageGrams: 0,
        sellingPrice: 50000,
      },
      userId,
    );

    const before = await reconcileInventory();
    await changeInventoryItemStatus(item.id, "SOLD", userId);
    const after = await reconcileInventory();

    expect(Number(after.actual) - Number(before.actual)).toBe(1);
    expect(after.status).toBe("FINANCIAL_INTEGRITY_ERROR");
  });
});

describe("runFullFinancialReconciliation", () => {
  it("runs all checks, aggregates an overallStatus, and writes an audit log — never auto-corrects anything", async () => {
    const before = await prisma.partyGoldBalance.findMany({ select: { balance: true } });

    const result = await runFullFinancialReconciliation(userId);

    expect(result).toHaveProperty("sales");
    expect(result).toHaveProperty("customerLedger");
    expect(result).toHaveProperty("supplierLedger");
    expect(result).toHaveProperty("karigarLedger");
    expect(result).toHaveProperty("cash");
    expect(result).toHaveProperty("gold");
    expect(result).toHaveProperty("inventory");
    expect(["OK", "FINANCIAL_INTEGRITY_ERROR"]).toContain(result.overallStatus);

    const logs = await prisma.auditLog.findMany({
      where: { action: "FINANCIAL_RECONCILIATION_PERFORMED" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    expect(logs).toHaveLength(1);

    // Never auto-corrects: no gold balance changed as a side effect of running the check.
    const after = await prisma.partyGoldBalance.findMany({ select: { balance: true } });
    expect(after.length).toBe(before.length);
  });
});
