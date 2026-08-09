import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const account = user.tradingAccounts[0];
  if (!account) return NextResponse.json({ error: "No trading account" }, { status: 400 });

  const accountId = account.id;

  const [
    tradingAccount,
    settings,
    trades,
    dailyPlans,
    dailyJournals,
    strategies,
    withdrawals,
    deposits,
    accountTransactions,
    allocationRule,
    allocationTransfers,
    goldTransactions,
    assets,
    expenses,
    goals,
    monthlyTargets,
    currencyRateHistory,
    goldRateHistory,
  ] = await Promise.all([
    prisma.tradingAccount.findUnique({ where: { id: accountId } }),
    prisma.settings.findUnique({ where: { userId: user.id } }),
    prisma.trade.findMany({ where: { tradingAccountId: accountId } }),
    prisma.dailyPlan.findMany({ where: { tradingAccountId: accountId } }),
    prisma.dailyJournal.findMany({ where: { tradingAccountId: accountId } }),
    prisma.strategy.findMany({ where: { tradingAccountId: accountId } }),
    prisma.withdrawal.findMany({ where: { tradingAccountId: accountId } }),
    prisma.deposit.findMany({ where: { tradingAccountId: accountId } }),
    prisma.accountTransaction.findMany({ where: { tradingAccountId: accountId } }),
    prisma.profitAllocationRule.findUnique({ where: { tradingAccountId: accountId } }),
    prisma.allocationTransfer.findMany({ where: { tradingAccountId: accountId } }),
    prisma.goldTransaction.findMany({ where: { tradingAccountId: accountId } }),
    prisma.asset.findMany({ where: { tradingAccountId: accountId } }),
    prisma.expense.findMany({ where: { tradingAccountId: accountId } }),
    prisma.goal.findMany({ where: { tradingAccountId: accountId } }),
    prisma.monthlyTarget.findMany({ where: { tradingAccountId: accountId } }),
    prisma.currencyRateHistory.findMany({ where: { tradingAccountId: accountId } }),
    prisma.goldRateHistory.findMany({ where: { tradingAccountId: accountId } }),
  ]);

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    traderName: user.traderName,
    tradingAccount,
    settings,
    trades,
    dailyPlans,
    dailyJournals,
    strategies,
    withdrawals,
    deposits,
    accountTransactions,
    allocationRule,
    allocationTransfers,
    goldTransactions,
    assets,
    expenses,
    goals,
    monthlyTargets,
    currencyRateHistory,
    goldRateHistory,
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bang-backup-${toDateInputValue(new Date())}.json"`,
    },
  });
}
