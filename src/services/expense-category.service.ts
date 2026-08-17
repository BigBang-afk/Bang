import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";

/**
 * Configurable expense categories — the seeded starter set (Rent,
 * Electricity, ...) plus anything OWNER/ADMIN adds afterward. Never
 * hardcode a category name into business logic; nothing in this codebase
 * branches on a category's name. See EXPENSE-SYSTEM.md "Categories".
 */

export class DuplicateExpenseCategoryError extends Error {
  constructor(message = "An expense category with this name already exists.") {
    super(message);
    this.name = "DuplicateExpenseCategoryError";
  }
}

export class ExpenseCategoryNotFoundError extends Error {
  constructor(message = "Expense category not found.") {
    super(message);
    this.name = "ExpenseCategoryNotFoundError";
  }
}

export type ExpenseCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
};

const CATEGORY_SELECT = { id: true, name: true, description: true, isSystem: true, isActive: true };

/** Every active category — the "Add Expense" form's picker. */
export async function listActiveExpenseCategories(): Promise<ExpenseCategoryRow[]> {
  return prisma.expenseCategory.findMany({
    where: { isActive: true },
    select: CATEGORY_SELECT,
    orderBy: { name: "asc" },
  });
}

/** Every category, active or not — the category management screen. */
export async function listAllExpenseCategories(): Promise<ExpenseCategoryRow[]> {
  return prisma.expenseCategory.findMany({ select: CATEGORY_SELECT, orderBy: { name: "asc" } });
}

export async function createExpenseCategory(
  input: { name: string; description?: string },
  userId: string,
): Promise<ExpenseCategoryRow> {
  const existing = await prisma.expenseCategory.findUnique({ where: { name: input.name } });
  if (existing) throw new DuplicateExpenseCategoryError();

  const category = await prisma.expenseCategory.create({
    data: {
      name: input.name,
      description: input.description || null,
      isSystem: false,
      createdById: userId,
    },
    select: CATEGORY_SELECT,
  });

  await writeAuditLog({
    userId,
    action: "EXPENSE_CATEGORY_CREATED",
    entity: "ExpenseCategory",
    entityId: category.id,
    metadata: { name: category.name },
  });

  return category;
}

/** Soft toggle only — a category is never deleted, since past expenses reference it. */
export async function setExpenseCategoryActive(id: string, isActive: boolean): Promise<void> {
  const category = await prisma.expenseCategory.findUnique({ where: { id } });
  if (!category) throw new ExpenseCategoryNotFoundError();
  await prisma.expenseCategory.update({ where: { id }, data: { isActive } });
}
