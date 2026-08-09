"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { tradeSchema } from "@/lib/validation";
import { convertUsdToPkrAndGold, toNumber } from "@/lib/money";
import { recordTransaction } from "@/lib/ledger";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

function computeResult(netPnlUsd: number, requested: "WIN" | "LOSS" | "BREAKEVEN") {
  return requested;
}

export async function createTradeAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account, settings } = await requireAccount();

  const parsed = tradeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid trade data" };
  }
  const data = parsed.data;

  const netPnlUsd =
    data.netPnlOverride !== null && data.netPnlOverride !== undefined
      ? data.netPnlOverride
      : data.grossPnlUsd - data.feesUsd;

  const rate = toNumber(settings.usdToPkrRate);
  const goldPrice = toNumber(settings.goldPricePerGramPkr);
  const { pkr, grams } = convertUsdToPkrAndGold(netPnlUsd, rate, goldPrice);

  await prisma.$transaction(async (tx) => {
    const trade = await tx.trade.create({
      data: {
        tradingAccountId: account.id,
        date: new Date(data.date),
        time: data.time || null,
        session: data.session || null,
        customSession: data.customSession || null,
        broker: data.broker || null,
        marketType: data.marketType,
        symbol: data.symbol,
        direction: data.direction,
        entryPrice: data.entryPrice ?? null,
        exitPrice: data.exitPrice ?? null,
        positionSize: data.positionSize ?? null,
        riskUsd: data.riskUsd ?? null,
        stopLoss: data.stopLoss ?? null,
        takeProfit: data.takeProfit ?? null,
        plannedRR: data.plannedRR ?? null,
        grossPnlUsd: data.grossPnlUsd,
        feesUsd: data.feesUsd,
        netPnlUsd,
        pnlPkr: pkr,
        goldEquivalentG: grams,
        usdPkrRateAtEntry: rate,
        goldPricePkrAtEntry: goldPrice,
        strategyId: data.strategyId || null,
        setup: data.setup || null,
        timeframe: data.timeframe || null,
        durationMinutes: data.durationMinutes ?? null,
        screenshotUrl: data.screenshotUrl || null,
        notes: data.notes || null,
        emotion: data.emotion || null,
        qualityRating: data.qualityRating ?? null,
        result: computeResult(netPnlUsd, data.result),
      },
    });

    await recordTransaction(tx, {
      tradingAccountId: account.id,
      date: new Date(data.date),
      type: "TRADE_PNL",
      amountUsd: netPnlUsd,
      relatedTradeId: trade.id,
      notes: `${data.symbol} ${data.direction} trade P&L`,
    });
  });

  revalidatePath("/", "layout");
  return {};
}

export async function updateTradeAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();

  const parsed = tradeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid trade data" };
  }
  const data = parsed.data;
  if (!data.id) return { error: "Missing trade id" };

  const existing = await prisma.trade.findFirst({ where: { id: data.id, tradingAccountId: account.id } });
  if (!existing) return { error: "Trade not found" };

  const netPnlUsd =
    data.netPnlOverride !== null && data.netPnlOverride !== undefined
      ? data.netPnlOverride
      : data.grossPnlUsd - data.feesUsd;

  // Preserve the rate snapshot from when the trade was originally entered.
  const rate = toNumber(existing.usdPkrRateAtEntry);
  const goldPrice = toNumber(existing.goldPricePkrAtEntry);
  const { pkr, grams } = convertUsdToPkrAndGold(netPnlUsd, rate, goldPrice);

  await prisma.$transaction(async (tx) => {
    await tx.trade.update({
      where: { id: data.id },
      data: {
        date: new Date(data.date),
        time: data.time || null,
        session: data.session || null,
        customSession: data.customSession || null,
        broker: data.broker || null,
        marketType: data.marketType,
        symbol: data.symbol,
        direction: data.direction,
        entryPrice: data.entryPrice ?? null,
        exitPrice: data.exitPrice ?? null,
        positionSize: data.positionSize ?? null,
        riskUsd: data.riskUsd ?? null,
        stopLoss: data.stopLoss ?? null,
        takeProfit: data.takeProfit ?? null,
        plannedRR: data.plannedRR ?? null,
        grossPnlUsd: data.grossPnlUsd,
        feesUsd: data.feesUsd,
        netPnlUsd,
        pnlPkr: pkr,
        goldEquivalentG: grams,
        strategyId: data.strategyId || null,
        setup: data.setup || null,
        timeframe: data.timeframe || null,
        durationMinutes: data.durationMinutes ?? null,
        screenshotUrl: data.screenshotUrl || null,
        notes: data.notes || null,
        emotion: data.emotion || null,
        qualityRating: data.qualityRating ?? null,
        result: computeResult(netPnlUsd, data.result),
      },
    });

    await tx.accountTransaction.updateMany({
      where: { relatedTradeId: data.id },
      data: { amountUsd: netPnlUsd, date: new Date(data.date) },
    });
  });

  revalidatePath("/", "layout");
  return {};
}

export async function deleteTradeAction(id: string): Promise<ActionResult> {
  const { account } = await requireAccount();
  const existing = await prisma.trade.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!existing) return { error: "Trade not found" };

  await prisma.$transaction(async (tx) => {
    await tx.accountTransaction.deleteMany({ where: { relatedTradeId: id } });
    await tx.trade.update({ where: { id }, data: { deletedAt: new Date() } });
  });

  revalidatePath("/", "layout");
  return {};
}

export async function duplicateTradeAction(id: string): Promise<ActionResult> {
  const { account, settings } = await requireAccount();
  const existing = await prisma.trade.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!existing) return { error: "Trade not found" };

  const rate = toNumber(settings.usdToPkrRate);
  const goldPrice = toNumber(settings.goldPricePerGramPkr);
  const netPnlUsd = toNumber(existing.netPnlUsd);
  const { pkr, grams } = convertUsdToPkrAndGold(netPnlUsd, rate, goldPrice);

  await prisma.$transaction(async (tx) => {
    const copy = await tx.trade.create({
      data: {
        tradingAccountId: account.id,
        date: new Date(),
        time: existing.time,
        session: existing.session,
        customSession: existing.customSession,
        broker: existing.broker,
        marketType: existing.marketType,
        symbol: existing.symbol,
        direction: existing.direction,
        entryPrice: existing.entryPrice,
        exitPrice: existing.exitPrice,
        positionSize: existing.positionSize,
        riskUsd: existing.riskUsd,
        stopLoss: existing.stopLoss,
        takeProfit: existing.takeProfit,
        plannedRR: existing.plannedRR,
        grossPnlUsd: existing.grossPnlUsd,
        feesUsd: existing.feesUsd,
        netPnlUsd,
        pnlPkr: pkr,
        goldEquivalentG: grams,
        usdPkrRateAtEntry: rate,
        goldPricePkrAtEntry: goldPrice,
        strategyId: existing.strategyId,
        setup: existing.setup,
        timeframe: existing.timeframe,
        durationMinutes: existing.durationMinutes,
        notes: existing.notes ? `${existing.notes} (duplicated)` : "Duplicated trade",
        emotion: existing.emotion,
        qualityRating: existing.qualityRating,
        result: existing.result,
      },
    });

    await recordTransaction(tx, {
      tradingAccountId: account.id,
      date: copy.date,
      type: "TRADE_PNL",
      amountUsd: netPnlUsd,
      relatedTradeId: copy.id,
      notes: `${existing.symbol} duplicated trade P&L`,
    });
  });

  revalidatePath("/", "layout");
  return {};
}
