"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { withdrawalSchema } from "@/lib/validation";
import { toNumber } from "@/lib/money";
import { recordTransaction, getCurrentBalance } from "@/lib/ledger";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function createWithdrawalAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account, settings } = await requireAccount();
  const parsed = withdrawalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid withdrawal data" };
  const data = parsed.data;

  const balance = await getCurrentBalance(account.id);
  if (data.amountUsd > balance) {
    return { error: `Withdrawal exceeds current trading balance of ${balance.toFixed(2)} USD.` };
  }

  const rate = toNumber(settings.usdToPkrRate);
  const pkrEquivalent = data.amountUsd * rate;

  await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.create({
      data: {
        tradingAccountId: account.id,
        date: new Date(data.date),
        amountUsd: data.amountUsd,
        pkrEquivalent,
        usdPkrRateAtEntry: rate,
        purpose: data.purpose || null,
        destination: data.destination,
        notes: data.notes || null,
      },
    });

    await recordTransaction(tx, {
      tradingAccountId: account.id,
      date: new Date(data.date),
      type: "WITHDRAWAL",
      amountUsd: -data.amountUsd,
      relatedWithdrawalId: withdrawal.id,
      notes: `Withdrawal to ${data.destination}`,
    });
  });

  revalidatePath("/", "layout");
  return {};
}

export async function deleteWithdrawalAction(id: string): Promise<ActionResult> {
  const { account } = await requireAccount();
  const existing = await prisma.withdrawal.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!existing) return { error: "Withdrawal not found" };

  await prisma.$transaction(async (tx) => {
    await tx.accountTransaction.deleteMany({ where: { relatedWithdrawalId: id } });
    await tx.withdrawal.delete({ where: { id } });
  });

  revalidatePath("/", "layout");
  return {};
}
