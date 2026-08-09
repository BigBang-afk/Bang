import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { toNumber } from "@/lib/money";

/**
 * Current trading balance is always derived from the account_transactions
 * ledger (starting capital + deposits + trade P&L - withdrawals - fees +/-
 * adjustments), never stored as a single manually edited number.
 */
export async function getCurrentBalance(tradingAccountId: string): Promise<number> {
  const result = await prisma.accountTransaction.aggregate({
    where: { tradingAccountId },
    _sum: { amountUsd: true },
  });
  return toNumber(result._sum.amountUsd);
}

export async function getBalanceAsOf(tradingAccountId: string, asOf: Date): Promise<number> {
  const result = await prisma.accountTransaction.aggregate({
    where: { tradingAccountId, date: { lte: asOf } },
    _sum: { amountUsd: true },
  });
  return toNumber(result._sum.amountUsd);
}

export async function recordTransaction(
  tx: Prisma.TransactionClient,
  data: {
    tradingAccountId: string;
    date: Date;
    type: "STARTING_CAPITAL" | "DEPOSIT" | "TRADE_PNL" | "WITHDRAWAL" | "FEE" | "ADJUSTMENT";
    amountUsd: Prisma.Decimal | number;
    relatedTradeId?: string;
    relatedWithdrawalId?: string;
    relatedDepositId?: string;
    notes?: string;
    isDemo?: boolean;
  }
) {
  return tx.accountTransaction.create({
    data: {
      tradingAccountId: data.tradingAccountId,
      date: data.date,
      type: data.type,
      amountUsd: data.amountUsd,
      relatedTradeId: data.relatedTradeId,
      relatedWithdrawalId: data.relatedWithdrawalId,
      relatedDepositId: data.relatedDepositId,
      notes: data.notes,
      isDemo: data.isDemo ?? false,
    },
  });
}

export async function getEquityCurve(tradingAccountId: string) {
  const transactions = await prisma.accountTransaction.findMany({
    where: { tradingAccountId },
    orderBy: { date: "asc" },
  });

  let running = 0;
  return transactions.map((t) => {
    running += toNumber(t.amountUsd);
    return { date: t.date, balance: running, type: t.type, amountUsd: toNumber(t.amountUsd) };
  });
}
