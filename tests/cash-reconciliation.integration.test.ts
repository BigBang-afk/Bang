import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  recordCashTransactionInTx,
  recordExpense,
  recordCashAdjustment,
  getCashBalance,
  InvalidCashAmountError,
} from "@/services/cash-transaction.service";
import {
  runGoldReconciliation,
  runCashReconciliation,
} from "@/services/reconciliation.service";
import { getSystemGoldWeightForPurity, appendGoldLedgerEntry } from "@/services/gold-ledger.service";
import { createKarigar } from "@/services/karigar.service";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

function uniquePhone(prefix: string): string {
  return `+9234${prefix}${Date.now()}${uniqueSuffix().slice(0, 4)}`;
}

describe("Cash transaction (Test 16)", () => {
  it("records an IN/OUT transaction with the correct direction, amount, and type", async () => {
    // Asserts against the created row directly rather than a live global balance —
    // the balance is shared, mutating state under concurrent test execution, so a
    // before/after delta on it would be inherently racy against other test files.
    const result = await prisma.$transaction((tx) =>
      recordCashTransactionInTx(tx, {
        transactionType: "EXPENSE",
        direction: "OUT",
        amount: 500,
        paymentMethod: "CASH",
        description: "Test expense",
        createdById: userId,
      }),
    );
    const row = await prisma.cashTransaction.findUniqueOrThrow({ where: { id: result.id } });
    expect(row.direction).toBe("OUT");
    expect(row.amount.toNumber()).toBe(500);
    expect(row.transactionType).toBe("EXPENSE");
  });

  it("rejects a zero or negative amount", async () => {
    await expect(recordExpense({ amount: 0, paymentMethod: "CASH", description: "Bad" }, userId)).rejects.toThrow(
      InvalidCashAmountError,
    );
  });

  it("recordExpense always posts OUT and writes CASH_TRANSACTION_RECORDED audit log", async () => {
    const result = await recordExpense({ amount: 250, paymentMethod: "CASH", description: "Electricity" }, userId);
    const row = await prisma.cashTransaction.findUniqueOrThrow({ where: { id: result.id } });
    expect(row.direction).toBe("OUT");
    expect(row.transactionType).toBe("EXPENSE");
    const logs = await prisma.auditLog.findMany({ where: { entity: "CashTransaction", entityId: result.id } });
    expect(logs.some((l) => l.action === "CASH_TRANSACTION_RECORDED")).toBe(true);
  });

  it("recordCashAdjustment requires a reason", async () => {
    await expect(
      recordCashAdjustment({ amount: 100, direction: "IN", paymentMethod: "CASH", reason: "" }, userId),
    ).rejects.toThrow();
  });
});

describe("Cash reconciliation (Test 17)", () => {
  // Scoped to paymentMethod "OTHER" — unlike "CASH", no other Phase 1-4 test file
  // writes CashTransaction rows with this method, so the balance it reads is not
  // racing against other test files' concurrent writes.
  it("MATCHED when physical count equals the system balance exactly", async () => {
    const system = await getCashBalance("OTHER");
    const result = await runCashReconciliation({ physicalAmount: Number(system), paymentMethod: "OTHER" }, userId);
    expect(result.status).toBe("MATCHED");
    expect(result.difference).toBe("0");
  });

  it("RECONCILIATION_REQUIRED when physical count differs, and never silently adjusts the balance", async () => {
    const system = await getCashBalance("OTHER");

    const result = await runCashReconciliation(
      { physicalAmount: Number(system) - 500, paymentMethod: "OTHER" },
      userId,
    );
    expect(result.status).toBe("RECONCILIATION_REQUIRED");
    expect(Number(result.difference)).toBeCloseTo(500, 5);

    // Running a reconciliation must never itself write a CashTransaction row —
    // a deterministic check unaffected by concurrent test files, since
    // reconciliation code never attaches this referenceType to anything.
    const linkedTransactions = await prisma.cashTransaction.count({ where: { referenceType: "CashReconciliation" } });
    expect(linkedTransactions).toBe(0);
  });

  it("writes a CASH_RECONCILIATION_COMPLETED audit log", async () => {
    const system = await getCashBalance("CASH");
    const result = await runCashReconciliation({ physicalAmount: Number(system), paymentMethod: "CASH" }, userId);
    const logs = await prisma.auditLog.findMany({
      where: { entity: "CashReconciliation", entityId: result.id, action: "CASH_RECONCILIATION_COMPLETED" },
    });
    expect(logs).toHaveLength(1);
  });
});

describe("Gold reconciliation (Test 18)", () => {
  it("MATCHED when physical weight equals the system-computed weight", async () => {
    const system = await getSystemGoldWeightForPurity("K18");
    const result = await runGoldReconciliation({ purity: "K18", physicalWeight: system.toNumber() }, userId);
    expect(result.status).toBe("MATCHED");
  });

  it("writes a GOLD_RECONCILIATION_COMPLETED audit log", async () => {
    const system = await getSystemGoldWeightForPurity("SILVER");
    const result = await runGoldReconciliation({ purity: "SILVER", physicalWeight: system.toNumber() }, userId);
    const logs = await prisma.auditLog.findMany({
      where: { entity: "GoldReconciliation", entityId: result.id, action: "GOLD_RECONCILIATION_COMPLETED" },
    });
    expect(logs).toHaveLength(1);
  });
});

describe("RECONCILIATION TEST — flags a mismatch, never auto-adjusts", () => {
  it("System 100g vs Physical 99.500g -> RECONCILIATION_REQUIRED, difference -0.500g, and no GoldLedgerEntry is created", async () => {
    const karigar = await createKarigar({ name: `Recon Karigar ${uniqueSuffix()}`, phone: uniquePhone("1") }, userId);

    // Isolate this test to a fresh purity value's worth of gold: give exactly 100g of K22.
    const before = await getSystemGoldWeightForPurity("K22");
    await prisma.$transaction((tx) =>
      appendGoldLedgerEntry(tx, {
        partyType: "KARIGAR",
        partyId: karigar.id,
        transactionType: "GOLD_GIVEN",
        purity: "K22",
        debit: 100,
        goldRate: 42000,
        goldValue: 4200000,
        referenceType: "Karigar",
        referenceId: karigar.id,
        createdById: userId,
      }),
    );
    const system = await getSystemGoldWeightForPurity("K22");
    expect(system.sub(before).toNumber()).toBeCloseTo(100, 5);

    const ledgerCountBefore = await prisma.goldLedgerEntry.count();

    const result = await runGoldReconciliation(
      { purity: "K22", physicalWeight: system.sub(0.5).toNumber() },
      userId,
    );

    expect(result.status).toBe("RECONCILIATION_REQUIRED");
    expect(Number(result.differenceWeight)).toBeCloseTo(0.5, 5);

    // No adjustment or correction happened automatically.
    const ledgerCountAfter = await prisma.goldLedgerEntry.count();
    expect(ledgerCountAfter).toBe(ledgerCountBefore);

    const systemAfterRecon = await getSystemGoldWeightForPurity("K22");
    expect(systemAfterRecon.toString()).toBe(system.toString());
  });
});
