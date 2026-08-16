import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createInventoryItem } from "@/services/inventory-item.service";
import { completeSale } from "@/services/sale-transaction.service";
import { createCustomer } from "@/services/customer.service";
import {
  listLedgerEntriesForCustomer,
  reconcileCustomerBalance,
  appendCustomerLedgerEntry,
} from "@/services/customer-ledger.service";
import {
  recordCustomerPayment,
  InvalidPaymentAmountError,
  CreditNotAValidPaymentMethodError,
  OverpaymentNotAllowedError,
} from "@/services/customer-payment.service";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";
import type { CreateInventoryItemInput } from "@/types/inventory";

let userId: string;
let categoryId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
  categoryId = await getTestCategoryId();
});

function uniquePhone(): string {
  return `+92301${Date.now()}${uniqueSuffix().slice(0, 4)}`;
}

function buildItemInput(overrides: Partial<CreateInventoryItemInput> = {}): CreateInventoryItemInput {
  return {
    productName: `Ledger Test Item ${uniqueSuffix()}`,
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

describe("Critical test — credit sale then full settlement", () => {
  it("500,000 sale / 400,000 payment -> 100,000 balance; then 100,000 payment -> 0 balance", async () => {
    const customer = await createCustomer({ firstName: `Critical ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    expect(customer.outstandingBalance.toNumber()).toBe(0);

    const item = await createSellableItem();
    await completeSale(
      {
        items: [{ inventoryItemId: item.id }],
        customerId: customer.id,
        payments: [
          { method: "CASH", amount: 400000 },
          { method: "CREDIT", amount: 100000 },
        ],
      },
      { id: userId, role: { name: "OWNER" } },
    );

    let updated = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(updated.outstandingBalance.toString()).toBe("100000");

    await recordCustomerPayment({ customerId: customer.id, amount: 100000, method: "CASH" }, userId);

    updated = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(updated.outstandingBalance.toString()).toBe("0");
  });
});

describe("Ledger logic — SALE debit / PAYMENT credit (Tests 13, 14)", () => {
  it("a fully paid sale posts a SALE debit and a matching PAYMENT credit, netting to zero", async () => {
    const customer = await createCustomer({ firstName: `FullyPaid ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createSellableItem();

    await completeSale(
      { items: [{ inventoryItemId: item.id }], customerId: customer.id, payments: [{ method: "CASH", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const { rows } = await listLedgerEntriesForCustomer(customer.id);
    const saleEntry = rows.find((r) => r.transactionType === "SALE");
    const paymentEntry = rows.find((r) => r.transactionType === "PAYMENT");
    expect(saleEntry?.debit.toString()).toBe("500000");
    expect(paymentEntry?.credit.toString()).toBe("500000");

    const updated = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(updated.outstandingBalance.toString()).toBe("0");
  });

  it("a partial-credit sale's SALE entry debits the full grand total, not just the credit portion", async () => {
    const customer = await createCustomer({ firstName: `Partial ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createSellableItem();

    await completeSale(
      {
        items: [{ inventoryItemId: item.id }],
        customerId: customer.id,
        payments: [
          { method: "CASH", amount: 300000 },
          { method: "CREDIT", amount: 200000 },
        ],
      },
      { id: userId, role: { name: "OWNER" } },
    );

    const { rows } = await listLedgerEntriesForCustomer(customer.id);
    const saleEntry = rows.find((r) => r.transactionType === "SALE");
    expect(saleEntry?.debit.toString()).toBe("500000");
  });
});

describe("Payment transaction (Tests 10, 11, 12, 15)", () => {
  it("accepts a full payment against the outstanding balance", async () => {
    const customer = await createCustomer({ firstName: `Full ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createSellableItem();
    await completeSale(
      {
        items: [{ inventoryItemId: item.id }],
        customerId: customer.id,
        payments: [{ method: "CREDIT", amount: 500000 }],
      },
      { id: userId, role: { name: "OWNER" } },
    );

    const result = await recordCustomerPayment({ customerId: customer.id, amount: 500000, method: "CASH" }, userId);
    expect(result.balanceAfter).toBe("0");
  });

  it("accepts a partial payment, leaving the remaining balance", async () => {
    const customer = await createCustomer({ firstName: `PartialPay ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createSellableItem();
    await completeSale(
      { items: [{ inventoryItemId: item.id }], customerId: customer.id, payments: [{ method: "CREDIT", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    const result = await recordCustomerPayment({ customerId: customer.id, amount: 200000, method: "CASH" }, userId);
    expect(result.balanceAfter).toBe("300000");
  });

  it("accumulates multiple payments correctly", async () => {
    const customer = await createCustomer({ firstName: `Multi ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createSellableItem();
    await completeSale(
      { items: [{ inventoryItemId: item.id }], customerId: customer.id, payments: [{ method: "CREDIT", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    await recordCustomerPayment({ customerId: customer.id, amount: 200000, method: "CASH" }, userId);
    await recordCustomerPayment({ customerId: customer.id, amount: 150000, method: "BANK_TRANSFER" }, userId);
    const final = await recordCustomerPayment({ customerId: customer.id, amount: 150000, method: "CARD" }, userId);
    expect(final.balanceAfter).toBe("0");

    const { total } = await listLedgerEntriesForCustomer(customer.id);
    expect(total).toBe(4); // 1 SALE + 3 PAYMENT entries
  });

  it("rejects a zero or negative payment amount", async () => {
    const customer = await createCustomer({ firstName: `Zero ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await expect(
      recordCustomerPayment({ customerId: customer.id, amount: 0, method: "CASH" }, userId),
    ).rejects.toThrow(InvalidPaymentAmountError);
    await expect(
      recordCustomerPayment({ customerId: customer.id, amount: -100, method: "CASH" }, userId),
    ).rejects.toThrow(InvalidPaymentAmountError);
  });

  it("rejects CREDIT as a payment method", async () => {
    const customer = await createCustomer({ firstName: `CreditReject ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await expect(
      recordCustomerPayment({ customerId: customer.id, amount: 100, method: "CREDIT" }, userId),
    ).rejects.toThrow(CreditNotAValidPaymentMethodError);
  });

  it("rejects a payment that exceeds the outstanding balance unless overpayment is explicitly allowed", async () => {
    const customer = await createCustomer({ firstName: `Overpay ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createSellableItem();
    await completeSale(
      { items: [{ inventoryItemId: item.id }], customerId: customer.id, payments: [{ method: "CREDIT", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );

    await expect(
      recordCustomerPayment({ customerId: customer.id, amount: 600000, method: "CASH" }, userId),
    ).rejects.toThrow(OverpaymentNotAllowedError);
  });

  it("writes a CUSTOMER_PAYMENT_RECEIVED audit log", async () => {
    const customer = await createCustomer({ firstName: `AuditPay ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createSellableItem();
    await completeSale(
      { items: [{ inventoryItemId: item.id }], customerId: customer.id, payments: [{ method: "CREDIT", amount: 500000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    await recordCustomerPayment({ customerId: customer.id, amount: 100000, method: "CASH" }, userId);

    const logs = await prisma.auditLog.findMany({
      where: { action: "CUSTOMER_PAYMENT_RECEIVED", entity: "CustomerPayment" },
    });
    expect(logs.length).toBeGreaterThan(0);
  });
});

describe("Reconciliation", () => {
  it("reports a matching cached balance and ledger-derived balance for a normal customer", async () => {
    const customer = await createCustomer({ firstName: `Reconcile ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createSellableItem();
    await completeSale(
      {
        items: [{ inventoryItemId: item.id }],
        customerId: customer.id,
        payments: [
          { method: "CASH", amount: 400000 },
          { method: "CREDIT", amount: 100000 },
        ],
      },
      { id: userId, role: { name: "OWNER" } },
    );

    const result = await reconcileCustomerBalance(customer.id);
    expect(result.matches).toBe(true);
    expect(result.cachedBalance).toBe(result.ledgerBalance);
  });

  it("detects a genuine mismatch rather than silently correcting it", async () => {
    const customer = await createCustomer({ firstName: `Mismatch ${uniqueSuffix()}`, phone: uniquePhone() }, userId);

    // Simulate drift by writing directly to the cached column, bypassing the
    // ledger primitive — something appendCustomerLedgerEntry() itself would
    // never allow to happen.
    await prisma.customer.update({ where: { id: customer.id }, data: { outstandingBalance: "999" } });

    const result = await reconcileCustomerBalance(customer.id);
    expect(result.matches).toBe(false);
    expect(result.cachedBalance).toBe("999");
    expect(result.ledgerBalance).toBe("0");
  });
});

describe("appendCustomerLedgerEntry — concurrency", () => {
  it("serializes concurrent entries for the same customer to a correct running balance", async () => {
    const customer = await createCustomer({ firstName: `Concurrent Ledger ${uniqueSuffix()}`, phone: uniquePhone() }, userId);

    await Promise.all(
      Array.from({ length: 5 }, () =>
        prisma.$transaction((tx) =>
          appendCustomerLedgerEntry(tx, {
            customerId: customer.id,
            transactionType: "DEBIT_ADJUSTMENT",
            referenceType: "Manual",
            referenceId: "test",
            debit: 1000,
            createdById: userId,
          }),
        ),
      ),
    );

    const updated = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(updated.outstandingBalance.toString()).toBe("5000");

    const result = await reconcileCustomerBalance(customer.id);
    expect(result.matches).toBe(true);
  });
});
