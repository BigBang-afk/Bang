import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { computeStreaks } from "@/lib/calc";
import { getCurrentBalance } from "@/lib/ledger";

export async function getDailyPlanData(tradingAccountId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [plan, todaysTrades, balance] = await Promise.all([
    prisma.dailyPlan.findUnique({ where: { tradingAccountId_date: { tradingAccountId, date: startOfToday } } }),
    prisma.trade.findMany({
      where: { tradingAccountId, deletedAt: null, date: { gte: startOfToday, lt: endOfToday } },
      orderBy: { createdAt: "asc" },
    }),
    getCurrentBalance(tradingAccountId),
  ]);

  const netPnlToday = todaysTrades.reduce((sum, t) => sum + toNumber(t.netPnlUsd), 0);
  const { currentStreak, currentStreakType, maxLossStreak } = computeStreaks(
    todaysTrades.map((t) => t.result as "WIN" | "LOSS" | "BREAKEVEN")
  );
  const currentLossStreak = currentStreakType === "LOSS" ? currentStreak : 0;

  return {
    plan,
    todaysTrades,
    tradesCount: todaysTrades.length,
    netPnlToday,
    currentLossStreak,
    maxLossStreakToday: maxLossStreak,
    balance,
  };
}
