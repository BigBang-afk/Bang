import type { Prisma } from "@prisma/client";

export interface TradeFilterParams {
  q?: string;
  range?: string; // today | yesterday | week | month | custom
  from?: string;
  to?: string;
  symbol?: string;
  market?: string;
  strategyId?: string;
  result?: string;
  session?: string;
}

export function buildTradeWhere(tradingAccountId: string, params: TradeFilterParams): Prisma.TradeWhereInput {
  const where: Prisma.TradeWhereInput = { tradingAccountId, deletedAt: null };

  if (params.q) {
    where.OR = [
      { symbol: { contains: params.q } },
      { notes: { contains: params.q } },
      { setup: { contains: params.q } },
      { broker: { contains: params.q } },
    ];
  }

  if (params.symbol) where.symbol = params.symbol;
  if (params.market) where.marketType = params.market;
  if (params.strategyId) where.strategyId = params.strategyId;
  if (params.result) where.result = params.result;
  if (params.session) where.session = params.session;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (params.range === "today") {
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + 1);
    where.date = { gte: startOfToday, lt: end };
  } else if (params.range === "yesterday") {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - 1);
    where.date = { gte: start, lt: startOfToday };
  } else if (params.range === "week") {
    const day = startOfToday.getDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - diffToMonday);
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + 1);
    where.date = { gte: start, lt: end };
  } else if (params.range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    where.date = { gte: start, lt: end };
  } else if (params.range === "custom" && (params.from || params.to)) {
    where.date = {};
    if (params.from) (where.date as Prisma.DateTimeFilter).gte = new Date(params.from);
    if (params.to) {
      const end = new Date(params.to);
      end.setDate(end.getDate() + 1);
      (where.date as Prisma.DateTimeFilter).lt = end;
    }
  }

  return where;
}
