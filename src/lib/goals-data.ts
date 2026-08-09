import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { getCurrentBalance } from "@/lib/ledger";
import { computeEquityCurveDrawdown } from "@/lib/calc";
import { getEquityCurve } from "@/lib/ledger";

export async function getCurrentGoalValue(
  tradingAccountId: string,
  type: string,
  unit: string,
  usdToPkrRate: number,
  goldPricePerGramPkr: number
): Promise<number> {
  if (type === "BALANCE") {
    const balance = await getCurrentBalance(tradingAccountId);
    return unit === "PKR" ? balance * usdToPkrRate : balance;
  }
  if (type === "MONTHLY_PROFIT") {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const agg = await prisma.trade.aggregate({
      where: { tradingAccountId, deletedAt: null, date: { gte: startOfMonth } },
      _sum: { netPnlUsd: true },
    });
    const usd = toNumber(agg._sum.netPnlUsd);
    return unit === "PKR" ? usd * usdToPkrRate : usd;
  }
  if (type === "GOLD_GRAMS") {
    const rows = await prisma.goldTransaction.findMany({ where: { tradingAccountId }, select: { txType: true, weightGrams: true } });
    return rows.reduce((sum, g) => sum + (g.txType === "SELL" ? -toNumber(g.weightGrams) : toNumber(g.weightGrams)), 0);
  }
  if (type === "SAVINGS") {
    const rows = await prisma.allocationTransfer.findMany({ where: { tradingAccountId, category: "SAVINGS" } });
    const usd = rows.reduce((sum, r) => sum + toNumber(r.amountUsd), 0);
    const pkr = rows.reduce((sum, r) => sum + toNumber(r.pkrEquivalent), 0);
    return unit === "PKR" ? pkr : usd;
  }
  if (type === "NET_WORTH") {
    const [balance, goldRows, assets] = await Promise.all([
      getCurrentBalance(tradingAccountId),
      prisma.goldTransaction.findMany({ where: { tradingAccountId }, select: { txType: true, weightGrams: true } }),
      prisma.asset.findMany({ where: { tradingAccountId }, select: { valuePkr: true, valueUsd: true } }),
    ]);
    const goldGrams = goldRows.reduce((sum, g) => sum + (g.txType === "SELL" ? -toNumber(g.weightGrams) : toNumber(g.weightGrams)), 0);
    const goldValuePkr = goldGrams * goldPricePerGramPkr;
    const assetsPkr = assets.reduce((sum, a) => sum + toNumber(a.valuePkr) + toNumber(a.valueUsd) * usdToPkrRate, 0);
    const netWorthPkr = balance * usdToPkrRate + goldValuePkr + assetsPkr;
    return unit === "PKR" ? netWorthPkr : usdToPkrRate > 0 ? netWorthPkr / usdToPkrRate : 0;
  }
  return 0;
}

export async function getMonthlyTargetProgress(tradingAccountId: string, month: number, year: number) {
  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);

  const [tradeAgg, withdrawalAgg, goldAgg, savingsAgg, equityCurve] = await Promise.all([
    prisma.trade.aggregate({
      where: { tradingAccountId, deletedAt: null, date: { gte: startOfMonth, lt: startOfNextMonth } },
      _sum: { netPnlUsd: true },
    }),
    prisma.withdrawal.aggregate({
      where: { tradingAccountId, date: { gte: startOfMonth, lt: startOfNextMonth } },
      _sum: { amountUsd: true },
    }),
    prisma.goldTransaction.findMany({
      where: { tradingAccountId, date: { gte: startOfMonth, lt: startOfNextMonth }, txType: "BUY" },
      select: { weightGrams: true },
    }),
    prisma.allocationTransfer.aggregate({
      where: { tradingAccountId, category: "SAVINGS", date: { gte: startOfMonth, lt: startOfNextMonth } },
      _sum: { amountUsd: true },
    }),
    getEquityCurve(tradingAccountId),
  ]);

  const monthPoints = equityCurve.filter((p) => p.date >= startOfMonth && p.date < startOfNextMonth);
  const drawdown = monthPoints.length > 0 ? computeEquityCurveDrawdown(monthPoints) : null;

  return {
    actualProfit: toNumber(tradeAgg._sum.netPnlUsd),
    actualWithdrawn: toNumber(withdrawalAgg._sum.amountUsd),
    actualGoldPurchased: goldAgg.reduce((sum, g) => sum + toNumber(g.weightGrams), 0),
    actualSavings: toNumber(savingsAgg._sum.amountUsd),
    actualMaxDrawdownPct: drawdown?.maxDrawdownPct ?? 0,
  };
}
