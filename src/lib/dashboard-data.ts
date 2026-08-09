import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { getCurrentBalance } from "@/lib/ledger";
import { computeWinLossStats, computeStreaks } from "@/lib/calc";

export async function getDashboardData(tradingAccountId: string, countBreakevenAsWin: boolean) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const day = startOfToday.getDay();
  const diffToMonday = (day + 6) % 7;
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    balance,
    todayAgg,
    weekAgg,
    monthTrades,
    allTradesAgg,
    withdrawnAgg,
    monthWithdrawnAgg,
    goldAgg,
    allocationTransfers,
    assets,
    dailyPlan,
    goals,
  ] = await Promise.all([
    getCurrentBalance(tradingAccountId),
    prisma.trade.aggregate({
      where: { tradingAccountId, deletedAt: null, date: { gte: startOfToday, lt: endOfToday } },
      _sum: { netPnlUsd: true, pnlPkr: true, goldEquivalentG: true },
    }),
    prisma.trade.aggregate({
      where: { tradingAccountId, deletedAt: null, date: { gte: startOfWeek, lt: endOfToday } },
      _sum: { netPnlUsd: true },
    }),
    prisma.trade.findMany({
      where: { tradingAccountId, deletedAt: null, date: { gte: startOfMonth, lt: endOfToday } },
      include: { strategy: true },
    }),
    prisma.trade.findMany({
      where: { tradingAccountId, deletedAt: null },
      select: { netPnlUsd: true },
    }),
    prisma.withdrawal.aggregate({ where: { tradingAccountId }, _sum: { amountUsd: true } }),
    prisma.withdrawal.aggregate({
      where: { tradingAccountId, date: { gte: startOfMonth, lt: endOfToday } },
      _sum: { amountUsd: true },
    }),
    prisma.goldTransaction.findMany({ where: { tradingAccountId }, select: { txType: true, weightGrams: true } }),
    prisma.allocationTransfer.findMany({ where: { tradingAccountId } }),
    prisma.asset.findMany({ where: { tradingAccountId }, select: { valuePkr: true } }),
    prisma.dailyPlan.findUnique({
      where: { tradingAccountId_date: { tradingAccountId, date: startOfToday } },
    }),
    prisma.goal.findMany({ where: { tradingAccountId, achieved: false }, take: 3, orderBy: { createdAt: "desc" } }),
  ]);

  const todaysTrades = await prisma.trade.findMany({
    where: { tradingAccountId, deletedAt: null, date: { gte: startOfToday, lt: endOfToday } },
    orderBy: { createdAt: "asc" },
    select: { result: true },
  });
  const { currentStreak, currentStreakType } = computeStreaks(todaysTrades.map((t) => t.result as "WIN" | "LOSS" | "BREAKEVEN"));
  const currentLossStreak = currentStreakType === "LOSS" ? currentStreak : 0;

  const totalProfit = allTradesAgg.reduce((sum, t) => (toNumber(t.netPnlUsd) > 0 ? sum + toNumber(t.netPnlUsd) : sum), 0);
  const totalLoss = allTradesAgg.reduce((sum, t) => (toNumber(t.netPnlUsd) < 0 ? sum + Math.abs(toNumber(t.netPnlUsd)) : sum), 0);
  const netProfit = totalProfit - totalLoss;

  const monthStats = computeWinLossStats(
    monthTrades.map((t) => ({
      netPnlUsd: toNumber(t.netPnlUsd),
      result: t.result as "WIN" | "LOSS" | "BREAKEVEN",
      plannedRR: t.plannedRR ? toNumber(t.plannedRR) : null,
    })),
    countBreakevenAsWin
  );

  const strategyTotals = new Map<string, number>();
  for (const t of monthTrades) {
    if (!t.strategy) continue;
    strategyTotals.set(t.strategy.name, (strategyTotals.get(t.strategy.name) ?? 0) + toNumber(t.netPnlUsd));
  }
  let bestStrategy: string | null = null;
  let bestStrategyProfit = -Infinity;
  for (const [name, profit] of strategyTotals) {
    if (profit > bestStrategyProfit) {
      bestStrategyProfit = profit;
      bestStrategy = name;
    }
  }

  const goldGrams = goldAgg.reduce(
    (sum, g) => sum + (g.txType === "SELL" ? -toNumber(g.weightGrams) : toNumber(g.weightGrams)),
    0
  );

  const savingsUsd = allocationTransfers
    .filter((a) => a.category === "SAVINGS")
    .reduce((sum, a) => sum + toNumber(a.amountUsd), 0);
  const savingsPkr = allocationTransfers
    .filter((a) => a.category === "SAVINGS")
    .reduce((sum, a) => sum + toNumber(a.pkrEquivalent), 0);
  const wealthAllocatedUsd = allocationTransfers
    .filter((a) => a.category !== "TRADING_CAPITAL")
    .reduce((sum, a) => sum + toNumber(a.amountUsd), 0);
  const otherAssetsPkr = assets.reduce((sum, a) => sum + toNumber(a.valuePkr), 0);

  return {
    balance,
    todayPnlUsd: toNumber(todayAgg._sum.netPnlUsd),
    todayPnlPkr: toNumber(todayAgg._sum.pnlPkr),
    todayGoldG: toNumber(todayAgg._sum.goldEquivalentG),
    weekNet: toNumber(weekAgg._sum.netPnlUsd),
    monthNet: monthStats.netProfit,
    totalProfit,
    totalLoss,
    netProfit,
    totalWithdrawn: toNumber(withdrawnAgg._sum.amountUsd),
    monthWithdrawn: toNumber(monthWithdrawnAgg._sum.amountUsd),
    currentCapital: balance,
    totalWealthGenerated: netProfit + wealthAllocatedUsd,
    monthStats,
    bestStrategy,
    goldGrams,
    savingsUsd,
    savingsPkr,
    otherAssetsPkr,
    dailyPlan,
    goals,
    todaysTradesCount: todaysTrades.length,
    currentLossStreak,
  };
}
