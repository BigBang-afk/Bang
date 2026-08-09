import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { computeWinLossStats, computeEquityCurveDrawdown } from "@/lib/calc";
import { getEquityCurve } from "@/lib/ledger";
import { groupTradeStats } from "@/lib/group-stats";
import { toDateInputValue } from "@/lib/utils";

export async function getAnalyticsData(tradingAccountId: string, countBreakevenAsWin: boolean) {
  const trades = await prisma.trade.findMany({
    where: { tradingAccountId, deletedAt: null },
    include: { strategy: true },
    orderBy: { date: "asc" },
  });

  const plainTrades = trades.map((t) => ({
    date: t.date,
    netPnlUsd: toNumber(t.netPnlUsd),
    result: t.result as "WIN" | "LOSS" | "BREAKEVEN",
    plannedRR: t.plannedRR ? toNumber(t.plannedRR) : null,
    strategy: t.strategy?.name ?? "Unassigned",
    symbol: t.symbol,
  }));

  const overallStats = computeWinLossStats(plainTrades, countBreakevenAsWin);

  const equityCurve = await getEquityCurve(tradingAccountId);
  const dailyBalances = new Map<string, number>();
  for (const point of equityCurve) {
    dailyBalances.set(toDateInputValue(point.date), point.balance);
  }
  const drawdown = computeEquityCurveDrawdown(equityCurve.map((p) => ({ date: p.date, balance: p.balance })));

  // Daily P&L aggregation
  const dailyMap = new Map<string, number>();
  for (const t of plainTrades) {
    const key = toDateInputValue(t.date);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + t.netPnlUsd);
  }
  const dailyPnl = Array.from(dailyMap.entries())
    .map(([date, net]) => ({ date, net }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Weekly aggregation (ISO week key)
  const weeklyMap = new Map<string, number>();
  for (const t of plainTrades) {
    const d = new Date(t.date);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = toDateInputValue(monday);
    weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + t.netPnlUsd);
  }
  const weeklyPnl = Array.from(weeklyMap.entries())
    .map(([weekStart, net]) => ({ weekStart, net }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  // Monthly aggregation
  const monthlyMap = new Map<string, number>();
  for (const t of plainTrades) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + t.netPnlUsd);
  }
  const monthlyPnl = Array.from(monthlyMap.entries())
    .map(([month, net]) => ({ month, net }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Cumulative P&L (trades-only, excludes deposits/withdrawals)
  let cum = 0;
  const cumulativePnl = plainTrades.map((t) => {
    cum += t.netPnlUsd;
    return { date: toDateInputValue(t.date), cumulative: cum };
  });

  const bestDay = dailyPnl.reduce((best, d) => (best === null || d.net > best.net ? d : best), null as { date: string; net: number } | null);
  const worstDay = dailyPnl.reduce((worst, d) => (worst === null || d.net < worst.net ? d : worst), null as { date: string; net: number } | null);
  const bestWeek = weeklyPnl.reduce((best, w) => (best === null || w.net > best.net ? w : best), null as { weekStart: string; net: number } | null);
  const worstWeek = weeklyPnl.reduce((worst, w) => (worst === null || w.net < worst.net ? w : worst), null as { weekStart: string; net: number } | null);
  const bestMonth = monthlyPnl.reduce((best, m) => (best === null || m.net > best.net ? m : best), null as { month: string; net: number } | null);
  const worstMonth = monthlyPnl.reduce((worst, m) => (worst === null || m.net < worst.net ? m : worst), null as { month: string; net: number } | null);

  const strategyStats = groupTradeStats(plainTrades, (t) => t.strategy, countBreakevenAsWin);
  const symbolStats = groupTradeStats(plainTrades, (t) => t.symbol, countBreakevenAsWin);

  return {
    overallStats,
    equityCurve: equityCurve.map((p) => ({ date: toDateInputValue(p.date), balance: p.balance })),
    drawdown,
    dailyPnl,
    weeklyPnl,
    monthlyPnl,
    cumulativePnl,
    bestDay,
    worstDay,
    bestWeek,
    worstWeek,
    bestMonth,
    worstMonth,
    strategyStats: Array.from(strategyStats.entries()).map(([name, s]) => ({ name, ...s })),
    symbolStats: Array.from(symbolStats.entries()).map(([name, s]) => ({ name, ...s })),
  };
}
