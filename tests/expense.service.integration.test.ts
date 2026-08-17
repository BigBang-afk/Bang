import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createExpenseCategory,
  listActiveExpenseCategories,
  setExpenseCategoryActive,
  DuplicateExpenseCategoryError,
} from "@/services/expense-category.service";
import {
  createExpense,
  voidExpense,
  getExpenseById,
  listExpenses,
  InvalidExpenseAmountError,
  InvalidExpensePaymentMethodError,
  ExpenseAlreadyVoidedError,
  EmptyVoidReasonError,
} from "@/services/expense.service";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

async function createTestCategory() {
  return createExpenseCategory({ name: `Test Category ${uniqueSuffix()}` }, userId);
}

describe("Expense categories (Test 1)", () => {
  it("creates a category and writes an audit log", async () => {
    const category = await createTestCategory();
    expect(category.isSystem).toBe(false);
    expect(category.isActive).toBe(true);

    const logs = await prisma.auditLog.findMany({ where: { entity: "ExpenseCategory", entityId: category.id, action: "EXPENSE_CATEGORY_CREATED" } });
    expect(logs).toHaveLength(1);
  });

  it("rejects a duplicate category name", async () => {
    const name = `Duplicate Category ${uniqueSuffix()}`;
    await createExpenseCategory({ name }, userId);
    await expect(createExpenseCategory({ name }, userId)).rejects.toThrow(DuplicateExpenseCategoryError);
  });

  it("deactivating a category removes it from the active picker but keeps the row", async () => {
    const category = await createTestCategory();
    await setExpenseCategoryActive(category.id, false);

    const active = await listActiveExpenseCategories();
    expect(active.some((c) => c.id === category.id)).toBe(false);

    const stillExists = await prisma.expenseCategory.findUnique({ where: { id: category.id } });
    expect(stillExists).not.toBeNull();
  });

  it("the 19 seeded starter categories exist and are marked isSystem", async () => {
    const rent = await prisma.expenseCategory.findUnique({ where: { name: "Rent" } });
    expect(rent?.isSystem).toBe(true);
    const count = await prisma.expenseCategory.count({ where: { isSystem: true } });
    expect(count).toBeGreaterThanOrEqual(19);
  });
});

describe("Expense creation (Test 1) & payment (Test 2)", () => {
  it("creates an expense with a ZJ-EXP number, an audit log, and a matching CASH cash-out", async () => {
    const category = await createTestCategory();
    const result = await createExpense(
      { categoryId: category.id, description: "Electricity", amount: 25000, paymentMethod: "CASH", expenseDate: new Date() },
      userId,
    );

    expect(result.expenseNumber).toMatch(/^ZJ-EXP-\d{6,}$/);

    const expense = await getExpenseById(result.id);
    expect(expense?.amount.toString()).toBe("25000");
    expect(expense?.status).toBe("ACTIVE");

    // A row-level check, not a global-balance delta — getCashBalance() is a live, shared
    // aggregate mutated concurrently by other test files against this same dev database (see
    // PHASE-5-STATUS.md "Tests passed" for the identical, previously-documented class of flake).
    const cashTx = await prisma.cashTransaction.findFirst({
      where: { referenceType: "Expense", referenceId: result.id, transactionType: "EXPENSE" },
    });
    expect(cashTx?.direction).toBe("OUT");
    expect(cashTx?.amount.toString()).toBe("25000");

    const logs = await prisma.auditLog.findMany({ where: { entity: "Expense", entityId: result.id, action: "EXPENSE_CREATED" } });
    expect(logs).toHaveLength(1);
  });

  it("rejects a zero or negative amount", async () => {
    const category = await createTestCategory();
    await expect(
      createExpense({ categoryId: category.id, description: "Bad", amount: 0, paymentMethod: "CASH", expenseDate: new Date() }, userId),
    ).rejects.toThrow(InvalidExpenseAmountError);
  });

  it("rejects CREDIT as a payment method", async () => {
    const category = await createTestCategory();
    await expect(
      createExpense(
        { categoryId: category.id, description: "Bad", amount: 100, paymentMethod: "CREDIT" as never, expenseDate: new Date() },
        userId,
      ),
    ).rejects.toThrow(InvalidExpensePaymentMethodError);
  });

  it("lists and filters expenses by category and date", async () => {
    const category = await createTestCategory();
    const marker = `Filter test ${uniqueSuffix()}`;
    await createExpense({ categoryId: category.id, description: marker, amount: 500, paymentMethod: "CASH", expenseDate: new Date() }, userId);

    const { rows } = await listExpenses({ categoryId: category.id });
    expect(rows.some((r) => r.description === marker)).toBe(true);
  });
});

describe("Expense void & reversal (Test 3)", () => {
  it("voiding requires a non-empty reason", async () => {
    const category = await createTestCategory();
    const expense = await createExpense(
      { categoryId: category.id, description: "To void", amount: 1000, paymentMethod: "CASH", expenseDate: new Date() },
      userId,
    );
    await expect(voidExpense({ expenseId: expense.id, reason: "  " }, userId)).rejects.toThrow(EmptyVoidReasonError);
  });

  it("voids an expense, reverses its cash impact, and writes an audit log — never deletes the row", async () => {
    const category = await createTestCategory();
    const expense = await createExpense(
      { categoryId: category.id, description: "Mistaken entry", amount: 4000, paymentMethod: "CASH", expenseDate: new Date() },
      userId,
    );

    await voidExpense({ expenseId: expense.id, reason: "Duplicate entry" }, userId);

    const voided = await getExpenseById(expense.id);
    expect(voided?.status).toBe("VOIDED");
    expect(voided?.voidReason).toBe("Duplicate entry");

    // A row-level check for the reversal, not a global-balance delta (see the note above).
    const reversalTx = await prisma.cashTransaction.findFirst({
      where: { referenceType: "Expense", referenceId: expense.id, transactionType: "CASH_ADJUSTMENT" },
    });
    expect(reversalTx?.direction).toBe("IN");
    expect(reversalTx?.amount.toString()).toBe("4000");

    const logs = await prisma.auditLog.findMany({ where: { entity: "Expense", entityId: expense.id, action: "EXPENSE_VOIDED" } });
    expect(logs).toHaveLength(1);

    // The original row still exists, unedited except for its void fields — never deleted.
    const rawRow = await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } });
    expect(rawRow.amount.toString()).toBe("4000");
    expect(rawRow.description).toBe("Mistaken entry");
  });

  it("cannot void an already-voided expense", async () => {
    const category = await createTestCategory();
    const expense = await createExpense(
      { categoryId: category.id, description: "Void twice", amount: 500, paymentMethod: "CASH", expenseDate: new Date() },
      userId,
    );
    await voidExpense({ expenseId: expense.id, reason: "First void" }, userId);
    await expect(voidExpense({ expenseId: expense.id, reason: "Second void" }, userId)).rejects.toThrow(ExpenseAlreadyVoidedError);
  });

  it("a corrected expense links back to the voided one via reversalOfId", async () => {
    const category = await createTestCategory();
    const original = await createExpense(
      { categoryId: category.id, description: "Wrong amount", amount: 1000, paymentMethod: "CASH", expenseDate: new Date() },
      userId,
    );
    await voidExpense({ expenseId: original.id, reason: "Wrong amount entered" }, userId);

    const corrected = await createExpense(
      {
        categoryId: category.id,
        description: "Correct amount",
        amount: 1200,
        paymentMethod: "CASH",
        expenseDate: new Date(),
        reversalOfId: original.id,
      },
      userId,
    );

    const rawRow = await prisma.expense.findUniqueOrThrow({ where: { id: corrected.id } });
    expect(rawRow.reversalOfId).toBe(original.id);
  });
});
