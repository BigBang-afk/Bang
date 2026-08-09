"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { allocationRuleSchema, allocationTransferSchema } from "@/lib/validation";
import { toNumber, convertUsdToPkrAndGold } from "@/lib/money";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function updateAllocationRuleAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = allocationRuleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid allocation rule" };
  const data = parsed.data;

  await prisma.profitAllocationRule.upsert({
    where: { tradingAccountId: account.id },
    create: { tradingAccountId: account.id, ...data },
    update: data,
  });

  revalidatePath("/allocation");
  revalidatePath("/dashboard");
  return {};
}

export async function createAllocationTransferAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account, settings } = await requireAccount();
  const parsed = allocationTransferSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid transfer" };
  const data = parsed.data;

  const rate = toNumber(settings.usdToPkrRate);
  const goldPrice = toNumber(settings.goldPricePerGramPkr);
  const { pkr, grams } = convertUsdToPkrAndGold(data.amountUsd, rate, goldPrice);

  await prisma.allocationTransfer.create({
    data: {
      tradingAccountId: account.id,
      date: new Date(data.date),
      category: data.category,
      amountUsd: data.amountUsd,
      pkrEquivalent: pkr,
      usdPkrRateAtEntry: rate,
      goldGrams: data.category === "GOLD" ? (data.goldGrams ?? grams) : data.goldGrams ?? null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/allocation");
  revalidatePath("/dashboard");
  revalidatePath("/wealth");
  return {};
}

export async function deleteAllocationTransferAction(id: string): Promise<ActionResult> {
  const { account } = await requireAccount();
  const existing = await prisma.allocationTransfer.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!existing) return { error: "Transfer not found" };
  await prisma.allocationTransfer.delete({ where: { id } });
  revalidatePath("/allocation");
  revalidatePath("/dashboard");
  return {};
}
