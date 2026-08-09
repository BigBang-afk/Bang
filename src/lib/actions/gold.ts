"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { goldTransactionSchema } from "@/lib/validation";
import { toNumber } from "@/lib/money";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function createGoldTransactionAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account, settings } = await requireAccount();
  const parsed = goldTransactionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid gold transaction" };
  const data = parsed.data;

  const rate = toNumber(settings.usdToPkrRate);
  const totalCostPkr = data.weightGrams * data.pricePerGramPkr;
  const usdEquivalent = totalCostPkr / rate;

  await prisma.goldTransaction.create({
    data: {
      tradingAccountId: account.id,
      date: new Date(data.date),
      txType: data.txType,
      goldType: data.goldType || null,
      purity: data.purity,
      purityCustomLabel: data.purityCustomLabel || null,
      weightGrams: data.weightGrams,
      pricePerGramPkr: data.pricePerGramPkr,
      totalCostPkr,
      usdEquivalent,
      usdPkrRateAtEntry: rate,
      dealer: data.dealer || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/gold");
  revalidatePath("/wealth");
  revalidatePath("/dashboard");
  return {};
}

export async function updateGoldTransactionAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = goldTransactionSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return { error: "Invalid gold transaction" };
  const data = parsed.data;

  const existing = await prisma.goldTransaction.findFirst({ where: { id: data.id, tradingAccountId: account.id } });
  if (!existing) return { error: "Transaction not found" };

  const rate = toNumber(existing.usdPkrRateAtEntry);
  const totalCostPkr = data.weightGrams * data.pricePerGramPkr;
  const usdEquivalent = totalCostPkr / rate;

  await prisma.goldTransaction.update({
    where: { id: data.id },
    data: {
      date: new Date(data.date),
      txType: data.txType,
      goldType: data.goldType || null,
      purity: data.purity,
      purityCustomLabel: data.purityCustomLabel || null,
      weightGrams: data.weightGrams,
      pricePerGramPkr: data.pricePerGramPkr,
      totalCostPkr,
      usdEquivalent,
      dealer: data.dealer || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/gold");
  revalidatePath("/wealth");
  return {};
}

export async function deleteGoldTransactionAction(id: string): Promise<ActionResult> {
  const { account } = await requireAccount();
  const existing = await prisma.goldTransaction.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!existing) return { error: "Transaction not found" };
  await prisma.goldTransaction.delete({ where: { id } });
  revalidatePath("/gold");
  revalidatePath("/wealth");
  revalidatePath("/dashboard");
  return {};
}
