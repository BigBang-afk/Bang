import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { getCurrentBalance } from "@/lib/ledger";

export async function getHeaderData(tradingAccountId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [balance, todayAgg] = await Promise.all([
    getCurrentBalance(tradingAccountId),
    prisma.trade.aggregate({
      where: {
        tradingAccountId,
        deletedAt: null,
        date: { gte: startOfDay, lt: endOfDay },
      },
      _sum: { netPnlUsd: true, pnlPkr: true, goldEquivalentG: true },
    }),
  ]);

  return {
    balance,
    todayPnlUsd: toNumber(todayAgg._sum.netPnlUsd),
    todayPnlPkr: toNumber(todayAgg._sum.pnlPkr),
    todayGoldG: toNumber(todayAgg._sum.goldEquivalentG),
  };
}
