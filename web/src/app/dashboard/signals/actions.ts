"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateSignal } from "@/lib/signals/engine";
import { SIGNAL_PAIRS } from "@/lib/signals/candles";
import { SUPPORTED_TIMEFRAMES } from "@/lib/signals/engine";

export async function runAiAnalysis(symbol: string, timeframe: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  if (!SIGNAL_PAIRS.some((p) => p.symbol === symbol)) {
    throw new Error("Unsupported pair");
  }
  if (!SUPPORTED_TIMEFRAMES.some((t) => t.value === timeframe)) {
    throw new Error("Unsupported timeframe");
  }

  const signal = await generateSignal(symbol, timeframe);

  // Only persist confirmed, tradeable signals into the history feed — an
  // unconfirmed/neutral read isn't a "signal", it's a "no trade" result, so
  // we still return it for display without writing a row.
  if (signal.confluence.confirmed && signal.levels && signal.direction !== "NEUTRAL") {
    await prisma.signal.create({
      data: {
        symbol: signal.symbol,
        timeframe: signal.timeframe,
        direction: signal.direction,
        price: signal.price,
        confidence: signal.confluence.confidence,
        agreeingCount: signal.confluence.agreeingCount,
        totalStrategies: signal.confluence.totalStrategies,
        entry: signal.levels.entry,
        stopLoss: signal.levels.stopLoss,
        takeProfit1: signal.levels.takeProfits[0],
        takeProfit2: signal.levels.takeProfits[1],
        takeProfit3: signal.levels.takeProfits[2],
        atr: signal.levels.atr,
        backtestWinRate: signal.backtest.winRate,
        backtestSampleSize: signal.backtest.wins + signal.backtest.losses,
        strategyBreakdown: JSON.parse(JSON.stringify(signal.confluence.votes)),
        requestedById: session.user.id,
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/signals");
  }

  return signal;
}
