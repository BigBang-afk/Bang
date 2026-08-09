"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { strategySchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function createStrategyAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = strategySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid strategy" };

  const existing = await prisma.strategy.findFirst({
    where: { tradingAccountId: account.id, name: parsed.data.name },
  });
  if (existing) return { error: "A strategy with that name already exists." };

  await prisma.strategy.create({
    data: { tradingAccountId: account.id, name: parsed.data.name, description: parsed.data.description || null },
  });
  revalidatePath("/strategies");
  revalidatePath("/trades/new");
  return {};
}

export async function updateStrategyAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = strategySchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return { error: "Invalid strategy" };

  const existing = await prisma.strategy.findFirst({ where: { id: parsed.data.id, tradingAccountId: account.id } });
  if (!existing) return { error: "Strategy not found" };

  await prisma.strategy.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name, description: parsed.data.description || null },
  });
  revalidatePath("/strategies");
  return {};
}

export async function deleteStrategyAction(id: string): Promise<ActionResult> {
  const { account } = await requireAccount();
  const existing = await prisma.strategy.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!existing) return { error: "Strategy not found" };

  const tradeCount = await prisma.trade.count({ where: { strategyId: id } });
  if (tradeCount > 0) {
    return { error: `Cannot delete: ${tradeCount} trade(s) still use this strategy. Reassign them first.` };
  }

  await prisma.strategy.delete({ where: { id } });
  revalidatePath("/strategies");
  return {};
}
