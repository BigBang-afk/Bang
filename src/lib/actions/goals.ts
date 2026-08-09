"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { goalSchema, monthlyTargetSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function createGoalAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid goal" };
  const data = parsed.data;

  await prisma.goal.create({
    data: {
      tradingAccountId: account.id,
      type: data.type,
      title: data.title,
      targetValue: data.targetValue,
      startValue: data.startValue,
      unit: data.unit,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return {};
}

export async function updateGoalAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return { error: "Invalid goal" };
  const data = parsed.data;

  const existing = await prisma.goal.findFirst({ where: { id: data.id, tradingAccountId: account.id } });
  if (!existing) return { error: "Goal not found" };

  await prisma.goal.update({
    where: { id: data.id },
    data: {
      type: data.type,
      title: data.title,
      targetValue: data.targetValue,
      startValue: data.startValue,
      unit: data.unit,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/goals");
  return {};
}

export async function toggleGoalAchievedAction(id: string, achieved: boolean): Promise<ActionResult> {
  const { account } = await requireAccount();
  const existing = await prisma.goal.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!existing) return { error: "Goal not found" };
  await prisma.goal.update({ where: { id }, data: { achieved } });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  const { account } = await requireAccount();
  const existing = await prisma.goal.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!existing) return { error: "Goal not found" };
  await prisma.goal.delete({ where: { id } });
  revalidatePath("/goals");
  return {};
}

export async function saveMonthlyTargetAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = monthlyTargetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid monthly target" };
  const data = parsed.data;

  await prisma.monthlyTarget.upsert({
    where: { tradingAccountId_month_year: { tradingAccountId: account.id, month: data.month, year: data.year } },
    create: {
      tradingAccountId: account.id,
      month: data.month,
      year: data.year,
      startingCapital: data.startingCapital,
      targetProfit: data.targetProfit,
      maxDrawdownPct: data.maxDrawdownPct,
      withdrawalGoal: data.withdrawalGoal ?? null,
      goldPurchaseGoalGrams: data.goldPurchaseGoalGrams ?? null,
      savingsGoal: data.savingsGoal ?? null,
      notes: data.notes || null,
    },
    update: {
      startingCapital: data.startingCapital,
      targetProfit: data.targetProfit,
      maxDrawdownPct: data.maxDrawdownPct,
      withdrawalGoal: data.withdrawalGoal ?? null,
      goldPurchaseGoalGrams: data.goldPurchaseGoalGrams ?? null,
      savingsGoal: data.savingsGoal ?? null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/goals");
  return {};
}
