"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { profitEntrySchema } from "@/lib/validation";
import { recordTransaction } from "@/lib/ledger";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function createProfitEntryAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = profitEntrySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid entry" };
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await recordTransaction(tx, {
      tradingAccountId: account.id,
      date: new Date(data.date),
      type: data.source === "TRADING" ? "TRADE_PNL" : "ADJUSTMENT",
      amountUsd: data.amountUsd,
      notes: data.notes || (data.source === "TRADING" ? "Quick profit/loss entry (trading)" : "Quick profit/loss entry (other)"),
    });
  });

  revalidatePath("/", "layout");
  return {};
}
