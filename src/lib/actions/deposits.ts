"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { depositSchema } from "@/lib/validation";
import { recordTransaction } from "@/lib/ledger";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function createDepositAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = depositSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid deposit data" };
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.create({
      data: {
        tradingAccountId: account.id,
        date: new Date(data.date),
        amountUsd: data.amountUsd,
        notes: data.notes || null,
      },
    });

    await recordTransaction(tx, {
      tradingAccountId: account.id,
      date: new Date(data.date),
      type: "DEPOSIT",
      amountUsd: data.amountUsd,
      relatedDepositId: deposit.id,
      notes: "Deposit to trading account",
    });
  });

  revalidatePath("/", "layout");
  return {};
}

export async function deleteDepositAction(id: string): Promise<ActionResult> {
  const { account } = await requireAccount();
  const existing = await prisma.deposit.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!existing) return { error: "Deposit not found" };

  await prisma.$transaction(async (tx) => {
    await tx.accountTransaction.deleteMany({ where: { relatedDepositId: id } });
    await tx.deposit.delete({ where: { id } });
  });

  revalidatePath("/", "layout");
  return {};
}
