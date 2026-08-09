import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { computeWinLossStats, computeEquityCurveDrawdown } from "@/lib/calc";
import { getBalanceAsOf, getEquityCurve } from "@/lib/ledger";
import { groupTradeStats } from "@/lib/group-stats";

export async function getPeriodReport(tradingAccountId: string, from: Date, to: Date, countBreakevenAsWin: boolean) {
  const exclusiveTo = new Date(to);
  exclusiveTo.setDate(exclusiveTo.getDate() + 1);

  const [trades, deposits, withdrawals, goldPurchases, savingsTransfers, expenses, startingBalance, endingBalance, equityCurve] =
    await Promise.all([
      prisma.trade.findMany({
        where: { tradingAccountId, deletedAt: null, date: { gte: from, lt: exclusiveTo } },
        include: { strategy: true },
        orderBy: { date: "asc" },
      }),
      prisma.deposit.aggregate({ where: { tradingAccountId, date: { gte: from, lt: exclusiveTo } }, _sum: { amountUsd: true } }),
      prisma.withdrawal.aggregate({ where: { tradingAccountId, date: { gte: from, lt: exclusiveTo } }, _sum: { amountUsd: true } }),
      prisma.goldTransaction.aggregate({
        where: { tradingAccountId, date: { gte: from, lt: exclusiveTo }, txType: "BUY" },
        _sum: { weightGrams: true },
      }),
      prisma.allocationTransfer.aggregate({
        where: { tradingAccountId, category: "SAVINGS", date: { gte: from, lt: exclusiveTo } },
        _sum: { amountUsd: true },
      }),
      prisma.expense.aggregate({ where: { tradingAccountId, date: { gte: from, lt: exclusiveTo } }, _sum: { amountPkr: true } }),
      getBalanceAsOf(tradingAccountId, new Date(from.getTime() - 1)),
      getBalanceAsOf(tradingAccountId, exclusiveTo),
      getEquityCurve(tradingAccountId),
    ]);

  const plainTrades = trades.map((t) => ({
    netPnlUsd: toNumber(t.netPnlUsd),
    grossPnlUsd: toNumber(t.grossPnlUsd),
    feesUsd: toNumber(t.feesUsd),
    result: t.result as "WIN" | "LOSS" | "BREAKEVEN",
    plannedRR: t.plannedRR ? toNumber(t.plannedRR) : null,
    riskUsd: t.riskUsd ? toNumber(t.riskUsd) : null,
    strategy: t.strategy?.name ?? null,
    symbol: t.symbol,
    date: t.date,
  }));

  const stats = computeWinLossStats(plainTrades, countBreakevenAsWin);
  const grossProfit = plainTrades.reduce((s, t) => (t.grossPnlUsd > 0 ? s + t.grossPnlUsd : s), 0);
  const grossLoss = plainTrades.reduce((s, t) => (t.grossPnlUsd < 0 ? s + Math.abs(t.grossPnlUsd) : s), 0);
  const totalFees = plainTrades.reduce((s, t) => s + t.feesUsd, 0);
  const avgRisk = plainTrades.filter((t) => t.riskUsd !== null).length
    ? plainTrades.reduce((s, t) => s + (t.riskUsd ?? 0), 0) / plainTrades.filter((t) => t.riskUsd !== null).length
    : 0;

  const periodPoints = equityCurve.filter((p) => p.date >= from && p.date < exclusiveTo);
  const drawdown = periodPoints.length > 0 ? computeEquityCurveDrawdown(periodPoints) : null;

  const bestTrade = plainTrades.reduce((best, t) => (best === null || t.netPnlUsd > best.netPnlUsd ? t : best), null as (typeof plainTrades)[number] | null);
  const worstTrade = plainTrades.reduce((worst, t) => (worst === null || t.netPnlUsd < worst.netPnlUsd ? t : worst), null as (typeof plainTrades)[number] | null);

  const strategyStats = groupTradeStats(
    plainTrades.filter((t) => t.strategy),
    (t) => t.strategy!,
    countBreakevenAsWin
  );
  const strategyEntries = Array.from(strategyStats.entries()).sort((a, b) => b[1].netProfit - a[1].netProfit);
  const bestStrategy = strategyEntries[0]?.[0] ?? null;
  const worstStrategy = strategyEntries[strategyEntries.length - 1]?.[0] ?? null;

  const symbolStats = groupTradeStats(plainTrades, (t) => t.symbol, countBreakevenAsWin);
  const symbolEntries = Array.from(symbolStats.entries()).sort((a, b) => b[1].netProfit - a[1].netProfit);
  const bestSymbol = symbolEntries[0]?.[0] ?? null;
  const worstSymbol = symbolEntries[symbolEntries.length - 1]?.[0] ?? null;

  const dailyMap = new Map<string, number>();
  for (const t of plainTrades) {
    const key = t.date.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + t.netPnlUsd);
  }
  const dailyEntries = Array.from(dailyMap.entries());
  const bestDay = dailyEntries.reduce<[string, number] | null>((best, [d, v]) => (best === null || v > best[1] ? [d, v] : best), null);
  const worstDay = dailyEntries.reduce<[string, number] | null>((worst, [d, v]) => (worst === null || v < worst[1] ? [d, v] : worst), null);

  const netTradingPnl = stats.netProfit;
  const returnPct = startingBalance > 0 ? (netTradingPnl / startingBalance) * 100 : 0;
  const depositsUsd = toNumber(deposits._sum.amountUsd);
  const withdrawalsUsd = toNumber(withdrawals._sum.amountUsd);
  const goldPurchasedG = toNumber(goldPurchases._sum.weightGrams);
  const savingsUsd = toNumber(savingsTransfers._sum.amountUsd);
  const expensesPkr = toNumber(expenses._sum.amountPkr);

  return {
    from,
    to,
    startingBalance,
    endingBalance,
    deposits: depositsUsd,
    withdrawals: withdrawalsUsd,
    grossProfit,
    grossLoss,
    fees: totalFees,
    netTradingPnl,
    returnPct,
    maxDrawdown: drawdown?.maxDrawdown ?? 0,
    maxDrawdownPct: drawdown?.maxDrawdownPct ?? 0,
    totalTrades: stats.totalTrades,
    wins: stats.wins,
    losses: stats.losses,
    breakeven: stats.breakeven,
    winRate: stats.winRate,
    avgWin: stats.avgWin,
    avgLoss: stats.avgLoss,
    avgRisk,
    profitFactor: stats.profitFactor,
    bestStrategy,
    worstStrategy,
    bestSymbol,
    worstSymbol,
    bestTrade,
    worstTrade,
    bestDay,
    worstDay,
    goldPurchasedG,
    savingsUsd,
    expensesPkr,
    netWorthChangeUsd: netTradingPnl + depositsUsd - withdrawalsUsd,
  };
}

export interface SmartInsight {
  text: string;
}

export async function getSmartInsights(tradingAccountId: string, countBreakevenAsWin: boolean): Promise<SmartInsight[]> {
  const insights: SmartInsight[] = [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthTrades = await prisma.trade.findMany({
    where: { tradingAccountId, deletedAt: null, date: { gte: startOfMonth } },
    include: { strategy: true },
    orderBy: { date: "asc" },
  });

  if (monthTrades.length === 0) {
    return [{ text: "Log a few trades this month to start seeing personalized insights from your own data." }];
  }

  const plain = monthTrades.map((t) => ({
    netPnlUsd: toNumber(t.netPnlUsd),
    result: t.result as "WIN" | "LOSS" | "BREAKEVEN",
    plannedRR: t.plannedRR ? toNumber(t.plannedRR) : null,
    session: t.session,
    symbol: t.symbol,
    strategy: t.strategy?.name ?? null,
  }));

  const sessionStats = groupTradeStats(plain.filter((t) => t.session), (t) => t.session!, countBreakevenAsWin);
  const bestSession = Array.from(sessionStats.entries()).sort((a, b) => b[1].netProfit - a[1].netProfit)[0];
  if (bestSession) {
    insights.push({ text: `Your strongest recorded session this month is ${bestSession[0].replace("_", " ")}, with ${bestSession[1].netProfit >= 0 ? "+" : ""}$${bestSession[1].netProfit.toFixed(2)} net profit.` });
  }

  const strategyStats = groupTradeStats(plain.filter((t) => t.strategy), (t) => t.strategy!, countBreakevenAsWin);
  const bestStrategy = Array.from(strategyStats.entries()).sort((a, b) => b[1].netProfit - a[1].netProfit)[0];
  if (bestStrategy) {
    insights.push({ text: `Your best-performing recorded strategy this month is ${bestStrategy[0]}, with a ${bestStrategy[1].winRate.toFixed(0)}% win rate.` });
  }

  const symbolStats = groupTradeStats(plain, (t) => t.symbol, countBreakevenAsWin);
  const symbolEntries = Array.from(symbolStats.entries()).filter(([, s]) => s.totalTrades >= 2);
  if (symbolEntries.length >= 2) {
    const sorted = [...symbolEntries].sort((a, b) => b[1].winRate - a[1].winRate);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    if (top[0] !== bottom[0]) {
      insights.push({ text: `Your recorded ${top[0]} win rate (${top[1].winRate.toFixed(0)}%) is higher than ${bottom[0]} (${bottom[1].winRate.toFixed(0)}%) this month.` });
    }
  }

  // Losses concentrated after Nth trade of the day
  const tradesByDay = new Map<string, typeof plain>();
  for (let i = 0; i < monthTrades.length; i++) {
    const key = monthTrades[i].date.toISOString().slice(0, 10);
    const arr = tradesByDay.get(key) ?? [];
    arr.push(plain[i]);
    tradesByDay.set(key, arr);
  }
  let lossesAfter5th = 0;
  let totalLosses = 0;
  for (const dayTrades of tradesByDay.values()) {
    dayTrades.forEach((t, idx) => {
      if (t.result === "LOSS") {
        totalLosses++;
        if (idx >= 5) lossesAfter5th++;
      }
    });
  }
  if (totalLosses >= 3 && lossesAfter5th / totalLosses >= 0.5) {
    insights.push({ text: `${Math.round((lossesAfter5th / totalLosses) * 100)}% of your recorded losses this month happened after your 6th trade of the day — consider a stricter daily trade limit.` });
  }

  if (insights.length === 0) {
    insights.push({ text: "Keep logging trades — more data will unlock deeper insights here." });
  }

  return insights;
}
