"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { setupSchema } from "@/lib/validation";
import { recordTransaction } from "@/lib/ledger";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/actions/auth";

export async function completeSetupAction(input: {
  traderName: string;
  startingBalanceUsd: number;
  mainTradingType: string;
  usdToPkrRate: number;
  goldPricePerGramPkr: number;
  ratesUpdatedAt?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = setupSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const existingAccount = await prisma.tradingAccount.findFirst({ where: { userId: user.id } });
  if (existingAccount) {
    return { error: "Setup has already been completed for this account." };
  }

  const ratesUpdatedAt = data.ratesUpdatedAt ? new Date(data.ratesUpdatedAt) : new Date();

  await prisma.$transaction(async (tx) => {
    const account = await tx.tradingAccount.create({
      data: {
        userId: user.id,
        mainTradingType: data.mainTradingType,
        startingBalanceUsd: data.startingBalanceUsd,
      },
    });

    await recordTransaction(tx, {
      tradingAccountId: account.id,
      date: new Date(),
      type: "STARTING_CAPITAL",
      amountUsd: data.startingBalanceUsd,
      notes: "Initial starting capital",
    });

    await tx.profitAllocationRule.create({
      data: { tradingAccountId: account.id },
    });

    await tx.currencyRateHistory.create({
      data: { tradingAccountId: account.id, rate: data.usdToPkrRate, effectiveAt: ratesUpdatedAt },
    });

    await tx.goldRateHistory.create({
      data: {
        tradingAccountId: account.id,
        pricePerGramPkr: data.goldPricePerGramPkr,
        effectiveAt: ratesUpdatedAt,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { traderName: data.traderName },
    });

    await tx.settings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        usdToPkrRate: data.usdToPkrRate,
        goldPricePerGramPkr: data.goldPricePerGramPkr,
        ratesUpdatedAt,
        setupCompleted: true,
      },
      update: {
        usdToPkrRate: data.usdToPkrRate,
        goldPricePerGramPkr: data.goldPricePerGramPkr,
        ratesUpdatedAt,
        setupCompleted: true,
      },
    });
  });

  redirect("/dashboard");
}
