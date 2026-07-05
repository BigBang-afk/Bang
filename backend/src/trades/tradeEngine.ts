import { prisma } from "../db/client";
import { feedManager } from "../priceFeed/feedManager";
import { findInstrument } from "../priceFeed/instruments";
import { HttpError } from "../util/httpError";
import { TradeDirection, TradeStatus } from "@prisma/client";

export const ALLOWED_EXPIRY_SECONDS = [30, 60, 300, 900] as const;

const SETTLEMENT_RETRY_MS = 2000;
const SETTLEMENT_MAX_RETRIES = 30; // ~1 minute grace if the feed hiccups right at expiry

export type TradeSettledListener = (trade: {
  id: number;
  userId: number;
  status: TradeStatus;
  exitPrice: number | null;
  payoutCents: string | null;
}) => void;

const settledListeners: TradeSettledListener[] = [];
export function onTradeSettled(listener: TradeSettledListener) {
  settledListeners.push(listener);
}

export async function openTrade(params: {
  userId: number;
  symbol: string;
  direction: TradeDirection;
  stakeCents: bigint;
  expirySeconds: number;
}) {
  const { userId, symbol, direction, stakeCents, expirySeconds } = params;

  const instrument = findInstrument(symbol);
  if (!instrument) throw new HttpError(400, `Unknown instrument: ${symbol}`);

  if (!(ALLOWED_EXPIRY_SECONDS as readonly number[]).includes(expirySeconds)) {
    throw new HttpError(400, `Invalid expiry, must be one of ${ALLOWED_EXPIRY_SECONDS.join(", ")} seconds`);
  }

  if (stakeCents <= 0n) throw new HttpError(400, "Stake must be positive");

  // Never open a trade without a genuinely live price — this is the one rule
  // that keeps outcomes honest (no fallback/synthetic price here).
  const liveTick = feedManager.getLivePrice(symbol); // throws if feed is down/stale

  const trade = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.balanceCents < stakeCents) {
      throw new HttpError(400, "Insufficient balance");
    }

    await tx.user.update({
      where: { id: userId },
      data: { balanceCents: { decrement: stakeCents } },
    });

    return tx.trade.create({
      data: {
        userId,
        symbol,
        assetClass: instrument.assetClass,
        direction,
        stakeCents,
        payoutRatio: instrument.payoutRatio,
        entryPrice: liveTick.price,
        expiryAt: new Date(Date.now() + expirySeconds * 1000),
      },
    });
  });

  scheduleSettlement(trade.id, expirySeconds * 1000);
  return trade;
}

function scheduleSettlement(tradeId: number, delayMs: number) {
  setTimeout(() => {
    settleTrade(tradeId, 0).catch((err) => console.error(`[trades] settlement error for #${tradeId}`, err));
  }, Math.max(delayMs, 0));
}

async function settleTrade(tradeId: number, attempt: number): Promise<void> {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade || trade.status !== TradeStatus.OPEN) return;

  let exitPrice: number;
  try {
    exitPrice = feedManager.getLivePrice(trade.symbol).price;
  } catch {
    if (attempt < SETTLEMENT_MAX_RETRIES) {
      setTimeout(() => {
        settleTrade(tradeId, attempt + 1).catch((err) =>
          console.error(`[trades] settlement retry error for #${tradeId}`, err)
        );
      }, SETTLEMENT_RETRY_MS);
      return;
    }
    // Feed has been down for ~1 minute past expiry: refund the stake rather
    // than settle against a stale/guessed price.
    await pushRefund(trade.id, trade.userId, trade.stakeCents);
    return;
  }

  const won =
    (trade.direction === TradeDirection.UP && exitPrice > trade.entryPrice) ||
    (trade.direction === TradeDirection.DOWN && exitPrice < trade.entryPrice);
  const tie = exitPrice === trade.entryPrice;

  await prisma.$transaction(async (tx) => {
    if (tie) {
      await tx.user.update({ where: { id: trade.userId }, data: { balanceCents: { increment: trade.stakeCents } } });
      await tx.trade.update({
        where: { id: trade.id },
        data: { status: TradeStatus.PUSH, exitPrice, payoutCents: trade.stakeCents, settledAt: new Date() },
      });
    } else if (won) {
      const payoutCents = trade.stakeCents + BigInt(Math.round(Number(trade.stakeCents) * trade.payoutRatio));
      await tx.user.update({ where: { id: trade.userId }, data: { balanceCents: { increment: payoutCents } } });
      await tx.trade.update({
        where: { id: trade.id },
        data: { status: TradeStatus.WON, exitPrice, payoutCents, settledAt: new Date() },
      });
    } else {
      await tx.trade.update({
        where: { id: trade.id },
        data: { status: TradeStatus.LOST, exitPrice, payoutCents: 0n, settledAt: new Date() },
      });
    }
  });

  const settled = await prisma.trade.findUniqueOrThrow({ where: { id: tradeId } });
  for (const listener of settledListeners) {
    listener({
      id: settled.id,
      userId: settled.userId,
      status: settled.status,
      exitPrice: settled.exitPrice,
      payoutCents: settled.payoutCents?.toString() ?? null,
    });
  }
}

async function pushRefund(tradeId: number, userId: number, stakeCents: bigint) {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { balanceCents: { increment: stakeCents } } });
    await tx.trade.update({
      where: { id: tradeId },
      data: { status: TradeStatus.PUSH, payoutCents: stakeCents, settledAt: new Date() },
    });
  });
}

/** Call once at startup: settle anything that expired while the server was down, and reschedule the rest. */
export async function recoverPendingTrades() {
  const openTrades = await prisma.trade.findMany({ where: { status: TradeStatus.OPEN } });
  for (const trade of openTrades) {
    const delay = trade.expiryAt.getTime() - Date.now();
    if (delay <= 0) {
      settleTrade(trade.id, 0).catch((err) => console.error(`[trades] recovery settlement error for #${trade.id}`, err));
    } else {
      scheduleSettlement(trade.id, delay);
    }
  }
  if (openTrades.length > 0) {
    console.log(`[trades] recovered ${openTrades.length} pending trade(s)`);
  }
}
