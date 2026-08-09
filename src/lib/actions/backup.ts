"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function withDate<T extends Row>(row: T, keys: string[]): T {
  const copy: Row = { ...row };
  for (const key of keys) {
    if (copy[key]) copy[key] = new Date(copy[key]);
  }
  return copy as T;
}

async function wipeAccountData(tradingAccountId: string) {
  await prisma.accountTransaction.deleteMany({ where: { tradingAccountId } });
  await prisma.trade.deleteMany({ where: { tradingAccountId } });
  await prisma.dailyPlan.deleteMany({ where: { tradingAccountId } });
  await prisma.dailyJournal.deleteMany({ where: { tradingAccountId } });
  await prisma.strategy.deleteMany({ where: { tradingAccountId } });
  await prisma.withdrawal.deleteMany({ where: { tradingAccountId } });
  await prisma.deposit.deleteMany({ where: { tradingAccountId } });
  await prisma.allocationTransfer.deleteMany({ where: { tradingAccountId } });
  await prisma.goldTransaction.deleteMany({ where: { tradingAccountId } });
  await prisma.asset.deleteMany({ where: { tradingAccountId } });
  await prisma.expense.deleteMany({ where: { tradingAccountId } });
  await prisma.goal.deleteMany({ where: { tradingAccountId } });
  await prisma.monthlyTarget.deleteMany({ where: { tradingAccountId } });
  await prisma.currencyRateHistory.deleteMany({ where: { tradingAccountId } });
  await prisma.goldRateHistory.deleteMany({ where: { tradingAccountId } });
  await prisma.attachment.deleteMany({ where: { tradingAccountId } });
}

export async function resetDataAction(): Promise<ActionResult> {
  const { account } = await requireAccount();

  await prisma.$transaction(async () => {
    await wipeAccountData(account.id);
    await prisma.accountTransaction.create({
      data: {
        tradingAccountId: account.id,
        date: new Date(),
        type: "STARTING_CAPITAL",
        amountUsd: account.startingBalanceUsd,
        notes: "Starting capital (after data reset)",
      },
    });
  });

  revalidatePath("/", "layout");
  return {};
}

export async function importBackupAction(jsonText: string): Promise<ActionResult> {
  const { account, user } = await requireAccount();

  let data: Row;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return { error: "That file is not valid JSON." };
  }
  if (!data || typeof data !== "object" || !Array.isArray(data.trades)) {
    return { error: "This does not look like a valid Bang backup file." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await wipeAccountData(account.id);

      if (data.tradingAccount) {
        await tx.tradingAccount.update({
          where: { id: account.id },
          data: {
            mainTradingType: data.tradingAccount.mainTradingType ?? account.mainTradingType,
            startingBalanceUsd: data.tradingAccount.startingBalanceUsd ?? account.startingBalanceUsd,
          },
        });
      }
      if (data.settings) {
        await tx.settings.update({
          where: { userId: user.id },
          data: {
            usdToPkrRate: data.settings.usdToPkrRate,
            goldPricePerGramPkr: data.settings.goldPricePerGramPkr,
            defaultRiskPct: data.settings.defaultRiskPct,
            defaultDailyTargetPct: data.settings.defaultDailyTargetPct,
            defaultDailyLossPct: data.settings.defaultDailyLossPct,
            defaultMaxTrades: data.settings.defaultMaxTrades,
            defaultMaxConsecutiveLosses: data.settings.defaultMaxConsecutiveLosses,
            countBreakevenAsWin: data.settings.countBreakevenAsWin,
            drawdownLowPct: data.settings.drawdownLowPct,
            drawdownModeratePct: data.settings.drawdownModeratePct,
            drawdownHighPct: data.settings.drawdownHighPct,
            drawdownCriticalPct: data.settings.drawdownCriticalPct,
          },
        });
      }

      for (const s of data.strategies ?? []) {
        await tx.strategy.create({ data: withDate({ ...s, tradingAccountId: account.id }, ["createdAt", "updatedAt"]) });
      }
      for (const t of data.trades ?? []) {
        await tx.trade.create({ data: withDate({ ...t, tradingAccountId: account.id }, ["date", "createdAt", "updatedAt", "deletedAt"]) });
      }
      for (const p of data.dailyPlans ?? []) {
        await tx.dailyPlan.create({ data: withDate({ ...p, tradingAccountId: account.id }, ["date", "createdAt", "updatedAt"]) });
      }
      for (const j of data.dailyJournals ?? []) {
        await tx.dailyJournal.create({ data: withDate({ ...j, tradingAccountId: account.id }, ["date", "createdAt", "updatedAt"]) });
      }
      for (const w of data.withdrawals ?? []) {
        await tx.withdrawal.create({ data: withDate({ ...w, tradingAccountId: account.id }, ["date", "createdAt", "updatedAt"]) });
      }
      for (const d of data.deposits ?? []) {
        await tx.deposit.create({ data: withDate({ ...d, tradingAccountId: account.id }, ["date", "createdAt", "updatedAt"]) });
      }
      for (const at of data.accountTransactions ?? []) {
        await tx.accountTransaction.create({ data: withDate({ ...at, tradingAccountId: account.id }, ["date", "createdAt"]) });
      }
      if (data.allocationRule) {
        await tx.profitAllocationRule.upsert({
          where: { tradingAccountId: account.id },
          create: withDate({ ...data.allocationRule, tradingAccountId: account.id }, ["createdAt", "updatedAt"]),
          update: withDate({ ...data.allocationRule, tradingAccountId: account.id }, ["createdAt", "updatedAt"]),
        });
      }
      for (const at of data.allocationTransfers ?? []) {
        await tx.allocationTransfer.create({ data: withDate({ ...at, tradingAccountId: account.id }, ["date", "createdAt"]) });
      }
      for (const g of data.goldTransactions ?? []) {
        await tx.goldTransaction.create({ data: withDate({ ...g, tradingAccountId: account.id }, ["date", "createdAt", "updatedAt"]) });
      }
      for (const a of data.assets ?? []) {
        await tx.asset.create({ data: withDate({ ...a, tradingAccountId: account.id }, ["createdAt", "updatedAt"]) });
      }
      for (const e of data.expenses ?? []) {
        await tx.expense.create({ data: withDate({ ...e, tradingAccountId: account.id }, ["date", "createdAt", "updatedAt"]) });
      }
      for (const g of data.goals ?? []) {
        await tx.goal.create({ data: withDate({ ...g, tradingAccountId: account.id }, ["targetDate", "createdAt", "updatedAt"]) });
      }
      for (const m of data.monthlyTargets ?? []) {
        await tx.monthlyTarget.create({ data: withDate({ ...m, tradingAccountId: account.id }, ["createdAt", "updatedAt"]) });
      }
      for (const c of data.currencyRateHistory ?? []) {
        await tx.currencyRateHistory.create({ data: withDate({ ...c, tradingAccountId: account.id }, ["effectiveAt"]) });
      }
      for (const g of data.goldRateHistory ?? []) {
        await tx.goldRateHistory.create({ data: withDate({ ...g, tradingAccountId: account.id }, ["effectiveAt"]) });
      }
    });
  } catch (e) {
    return { error: `Import failed: ${e instanceof Error ? e.message : "unknown error"}` };
  }

  revalidatePath("/", "layout");
  return {};
}
