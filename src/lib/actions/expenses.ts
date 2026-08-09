"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { expenseSchema } from "@/lib/validation";
import { toNumber } from "@/lib/money";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function createExpenseAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account, settings } = await requireAccount();
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid expense" };
  const data = parsed.data;

  const rate = toNumber(settings.usdToPkrRate);

  await prisma.expense.create({
    data: {
      tradingAccountId: account.id,
      date: new Date(data.date),
      category: data.category,
      description: data.description || null,
      amountPkr: data.amountPkr,
      usdEquivalent: rate > 0 ? data.amountPkr / rate : 0,
      usdPkrRateAtEntry: rate,
      paymentMethod: data.paymentMethod || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/expenses");
  return {};
}

export async function updateExpenseAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return { error: "Invalid expense" };
  const data = parsed.data;

  const existing = await prisma.expense.findFirst({ where: { id: data.id, tradingAccountId: account.id } });
  if (!existing) return { error: "Expense not found" };

  const rate = toNumber(existing.usdPkrRateAtEntry);

  await prisma.expense.update({
    where: { id: data.id },
    data: {
      date: new Date(data.date),
      category: data.category,
      description: data.description || null,
      amountPkr: data.amountPkr,
      usdEquivalent: rate > 0 ? data.amountPkr / rate : 0,
      paymentMethod: data.paymentMethod || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/expenses");
  return {};
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const { account } = await requireAccount();
  const existing = await prisma.expense.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!existing) return { error: "Expense not found" };
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
  return {};
}
