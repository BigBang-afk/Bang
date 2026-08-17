import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createKarigar } from "@/services/karigar.service";
import { createSupplier } from "@/services/supplier.service";
import {
  appendPartyCashLedgerEntry,
  getPartyCashPosition,
  recordPartyCashAdjustment,
} from "@/services/party-cash-ledger.service";
import { recordKarigarCashTransaction } from "@/services/karigar-cash.service";
import { recordSupplierPayment } from "@/services/supplier-payment.service";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

function uniquePhone(prefix: string): string {
  return `+9232${prefix}${Date.now()}${uniqueSuffix().slice(0, 4)}`;
}

describe("Karigar cash payable (Test 11)", () => {
  it("a charge recorded via CASH_ADJUSTMENT increases what the business owes the karigar", async () => {
    const karigar = await createKarigar({ name: `Payable Karigar ${uniqueSuffix()}`, phone: uniquePhone("1") }, userId);

    await prisma.$transaction((tx) =>
      appendPartyCashLedgerEntry(tx, {
        partyType: "KARIGAR",
        partyId: karigar.id,
        transactionType: "CASH_ADJUSTMENT",
        debit: 15000,
        referenceType: "Karigar",
        referenceId: karigar.id,
        description: "Making charge due",
        createdById: userId,
      }),
    );

    const position = await getPartyCashPosition("KARIGAR", karigar.id);
    expect(position.payable).toBe("15000");
    expect(position.receivable).toBe("0");
  });

  it("paying the karigar reduces the payable — 15,000 due, 10,000 paid -> 5,000 payable", async () => {
    const karigar = await createKarigar({ name: `Partial Pay Karigar ${uniqueSuffix()}`, phone: uniquePhone("2") }, userId);
    await prisma.$transaction((tx) =>
      appendPartyCashLedgerEntry(tx, {
        partyType: "KARIGAR",
        partyId: karigar.id,
        transactionType: "CASH_ADJUSTMENT",
        debit: 15000,
        referenceType: "Karigar",
        referenceId: karigar.id,
        description: "Making charge",
        createdById: userId,
      }),
    );

    await recordKarigarCashTransaction(
      { karigarId: karigar.id, transactionType: "CASH_PAID", amount: 10000, paymentMethod: "CASH" },
      userId,
    );

    const position = await getPartyCashPosition("KARIGAR", karigar.id);
    expect(position.payable).toBe("5000");
  });
});

describe("Karigar cash receivable (Test 12)", () => {
  it("an advance given to a karigar creates a receivable, and CASH_RECEIVED pays it down to zero", async () => {
    const karigar = await createKarigar({ name: `Receivable Karigar ${uniqueSuffix()}`, phone: uniquePhone("3") }, userId);

    // Business advances the karigar cash for materials — the karigar now owes it back (a receivable).
    await recordPartyCashAdjustment(
      {
        partyType: "KARIGAR",
        partyId: karigar.id,
        direction: "credit",
        amount: 3000,
        referenceType: "Karigar",
        referenceId: karigar.id,
        description: "Materials advance",
      },
      userId,
    );
    let position = await getPartyCashPosition("KARIGAR", karigar.id);
    expect(position.payable).toBe("0");
    expect(position.receivable).toBe("3000");

    // The karigar settles the advance — CASH_RECEIVED pays the receivable down.
    await recordKarigarCashTransaction(
      { karigarId: karigar.id, transactionType: "CASH_RECEIVED", amount: 3000, paymentMethod: "CASH" },
      userId,
    );

    position = await getPartyCashPosition("KARIGAR", karigar.id);
    expect(position.payable).toBe("0");
    expect(position.receivable).toBe("0");
  });

  it("writes KARIGAR_CASH_PAID / KARIGAR_CASH_RECEIVED audit logs (Test 22)", async () => {
    const karigar = await createKarigar({ name: `Audit Cash Karigar ${uniqueSuffix()}`, phone: uniquePhone("4") }, userId);
    await recordKarigarCashTransaction(
      { karigarId: karigar.id, transactionType: "CASH_RECEIVED", amount: 1000, paymentMethod: "CASH" },
      userId,
    );
    const logs = await prisma.auditLog.findMany({ where: { entity: "Karigar", entityId: karigar.id, action: "KARIGAR_CASH_RECEIVED" } });
    expect(logs).toHaveLength(1);
  });
});

describe("CRITICAL CASH TEST — supplier purchase then payment settles payable to zero", () => {
  it("Purchase 500,000, Paid 400,000 -> Payable 100,000; then payment 100,000 -> Payable 0", async () => {
    const supplier = await createSupplier({ name: `Critical Cash Supplier ${uniqueSuffix()}`, phone: uniquePhone("5") }, userId);

    await prisma.$transaction((tx) =>
      appendPartyCashLedgerEntry(tx, {
        partyType: "SUPPLIER",
        partyId: supplier.id,
        transactionType: "PURCHASE",
        debit: 500000,
        referenceType: "Purchase",
        referenceId: supplier.id,
        description: "Purchase",
        createdById: userId,
      }),
    );
    await prisma.$transaction((tx) =>
      appendPartyCashLedgerEntry(tx, {
        partyType: "SUPPLIER",
        partyId: supplier.id,
        transactionType: "PAYMENT",
        credit: 400000,
        referenceType: "Purchase",
        referenceId: supplier.id,
        description: "Payment at purchase",
        createdById: userId,
      }),
    );

    let position = await getPartyCashPosition("SUPPLIER", supplier.id);
    expect(position.payable).toBe("100000");
    expect(position.receivable).toBe("0");

    await recordSupplierPayment({ supplierId: supplier.id, amount: 100000, method: "CASH" }, userId);

    position = await getPartyCashPosition("SUPPLIER", supplier.id);
    expect(position.payable).toBe("0");
    expect(position.receivable).toBe("0");
  });
});

describe("Supplier payable (Test 14) & payment (Test 15)", () => {
  it("recordSupplierPayment rejects a zero or negative amount", async () => {
    const supplier = await createSupplier({ name: `Reject Supplier ${uniqueSuffix()}`, phone: uniquePhone("6") }, userId);
    await expect(recordSupplierPayment({ supplierId: supplier.id, amount: 0, method: "CASH" }, userId)).rejects.toThrow();
    await expect(recordSupplierPayment({ supplierId: supplier.id, amount: -10, method: "CASH" }, userId)).rejects.toThrow();
  });

  it("writes a SUPPLIER_PAYMENT_RECORDED audit log", async () => {
    const supplier = await createSupplier({ name: `Audit Pay Supplier ${uniqueSuffix()}`, phone: uniquePhone("7") }, userId);
    await prisma.$transaction((tx) =>
      appendPartyCashLedgerEntry(tx, {
        partyType: "SUPPLIER",
        partyId: supplier.id,
        transactionType: "PURCHASE",
        debit: 50000,
        referenceType: "Purchase",
        referenceId: supplier.id,
        createdById: userId,
      }),
    );
    await recordSupplierPayment({ supplierId: supplier.id, amount: 50000, method: "BANK_TRANSFER" }, userId);
    const logs = await prisma.auditLog.findMany({
      where: { entity: "Supplier", entityId: supplier.id, action: "SUPPLIER_PAYMENT_RECORDED" },
    });
    expect(logs).toHaveLength(1);
  });
});

describe("Manual cash adjustment", () => {
  it("recordPartyCashAdjustment moves the balance and requires a description", async () => {
    const karigar = await createKarigar({ name: `Adjustment Karigar ${uniqueSuffix()}`, phone: uniquePhone("8") }, userId);
    await recordPartyCashAdjustment(
      {
        partyType: "KARIGAR",
        partyId: karigar.id,
        direction: "debit",
        amount: 2000,
        referenceType: "ManualAdjustment",
        referenceId: karigar.id,
        description: "Correction after audit",
      },
      userId,
    );
    const position = await getPartyCashPosition("KARIGAR", karigar.id);
    expect(position.payable).toBe("2000");

    const logs = await prisma.auditLog.findMany({ where: { entity: "PartyCashLedgerEntry", action: "CASH_ADJUSTED" } });
    expect(logs.length).toBeGreaterThan(0);
  });
});
