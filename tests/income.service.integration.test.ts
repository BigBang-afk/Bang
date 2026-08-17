import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createIncome,
  voidIncome,
  getIncomeById,
  InvalidIncomeAmountError,
  InvalidIncomePaymentMethodError,
  IncomeAlreadyVoidedError,
  EmptyIncomeVoidReasonError,
} from "@/services/income.service";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

describe("Income creation", () => {
  it("creates income with a ZJ-INC number, an audit log, and a matching cash-in", async () => {
    const result = await createIncome(
      { incomeType: "SERVICE_INCOME", description: "Repair charge", amount: 3000, paymentMethod: "CASH", incomeDate: new Date() },
      userId,
    );
    expect(result.incomeNumber).toMatch(/^ZJ-INC-\d{6,}$/);

    const income = await getIncomeById(result.id);
    expect(income?.amount.toString()).toBe("3000");
    expect(income?.status).toBe("ACTIVE");

    // A row-level check, not a global-balance delta — getCashBalance() is a live, shared
    // aggregate that other test files mutate concurrently against this same dev database (see
    // PHASE-5-STATUS.md "Tests passed" for the identical, previously-documented class of flake).
    const cashTx = await prisma.cashTransaction.findFirst({ where: { referenceType: "Income", referenceId: result.id } });
    expect(cashTx?.direction).toBe("IN");
    expect(cashTx?.transactionType).toBe("INCOME_RECEIVED");

    const logs = await prisma.auditLog.findMany({ where: { entity: "Income", entityId: result.id, action: "INCOME_CREATED" } });
    expect(logs).toHaveLength(1);
  });

  it("rejects a zero amount", async () => {
    await expect(
      createIncome({ incomeType: "MISC_INCOME", description: "Bad", amount: 0, paymentMethod: "CASH", incomeDate: new Date() }, userId),
    ).rejects.toThrow(InvalidIncomeAmountError);
  });

  it("rejects CREDIT as a payment method — nothing was actually received", async () => {
    await expect(
      createIncome(
        { incomeType: "MISC_INCOME", description: "Bad", amount: 100, paymentMethod: "CREDIT" as never, incomeDate: new Date() },
        userId,
      ),
    ).rejects.toThrow(InvalidIncomePaymentMethodError);
  });

  it("never duplicates POS sales — income and Sale are structurally separate tables", async () => {
    const marker = `POS distinct check ${uniqueSuffix()}`;
    const created = await createIncome(
      { incomeType: "OTHER_INCOME", description: marker, amount: 100, paymentMethod: "CASH", incomeDate: new Date() },
      userId,
    );
    // A direct row lookup, not listIncomes({})'s default-paginated (20 rows, newest-first) list
    // — under the full suite's parallel execution, other files' concurrent income/date activity
    // can push this row off page 1 (the same class of flake Phase 5 fixed for karigar/supplier
    // search — see KARIGAR-SYSTEM.md).
    const found = await getIncomeById(created.id);
    expect(found?.description).toBe(marker);
    // Confirms this created an Income row, not a Sale — the two are never conflated.
    const saleCount = await prisma.sale.count({ where: { id: created.id } });
    expect(saleCount).toBe(0);
  });
});

describe("Income void", () => {
  it("voiding requires a reason and reverses the cash impact without deleting the row", async () => {
    const income = await createIncome(
      { incomeType: "MISC_INCOME", description: "Mistaken entry", amount: 5000, paymentMethod: "CASH", incomeDate: new Date() },
      userId,
    );
    await expect(voidIncome({ incomeId: income.id, reason: "" }, userId)).rejects.toThrow(EmptyIncomeVoidReasonError);

    await voidIncome({ incomeId: income.id, reason: "Recorded in error" }, userId);
    const voided = await getIncomeById(income.id);
    expect(voided?.status).toBe("VOIDED");

    // A row-level check for the reversal, not a global-balance delta (racy under concurrent tests).
    const reversalTx = await prisma.cashTransaction.findFirst({
      where: { referenceType: "Income", referenceId: income.id, transactionType: "CASH_ADJUSTMENT" },
    });
    expect(reversalTx?.direction).toBe("OUT");
    expect(reversalTx?.amount.toString()).toBe("5000");

    const logs = await prisma.auditLog.findMany({ where: { entity: "Income", entityId: income.id, action: "INCOME_VOIDED" } });
    expect(logs).toHaveLength(1);
  });

  it("cannot void an already-voided income entry", async () => {
    const income = await createIncome(
      { incomeType: "MISC_INCOME", description: "Void twice", amount: 500, paymentMethod: "CASH", incomeDate: new Date() },
      userId,
    );
    await voidIncome({ incomeId: income.id, reason: "First void" }, userId);
    await expect(voidIncome({ incomeId: income.id, reason: "Second void" }, userId)).rejects.toThrow(IncomeAlreadyVoidedError);
  });
});
