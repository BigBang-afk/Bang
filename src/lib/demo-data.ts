import "server-only";
import { prisma } from "@/lib/prisma";
import { convertUsdToPkrAndGold } from "@/lib/money";
import { recordTransaction } from "@/lib/ledger";

const SYMBOLS = ["XAUUSD", "EURUSD", "BTCUSD", "GBPUSD"];
const STRATEGIES = ["Price Action", "Breakout", "Support/Resistance"];
const SESSIONS = ["ASIA", "LONDON", "NEW_YORK"];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + (n % 6), 0, 0, 0);
  return d;
}

export async function seedDemoData(tradingAccountId: string, usdToPkrRate: number, goldPricePerGramPkr: number) {
  await prisma.$transaction(async (tx) => {
    const strategies = await Promise.all(
      STRATEGIES.map((name) =>
        tx.strategy.upsert({
          where: { tradingAccountId_name: { tradingAccountId, name } },
          create: { tradingAccountId, name, isDemo: true, description: "Demo strategy" },
          update: {},
        })
      )
    );

    const results: ("WIN" | "LOSS" | "BREAKEVEN")[] = [
      "WIN", "WIN", "LOSS", "WIN", "BREAKEVEN", "LOSS", "WIN", "WIN", "LOSS", "WIN",
      "LOSS", "WIN", "WIN", "LOSS", "WIN", "BREAKEVEN", "WIN", "LOSS", "WIN", "WIN",
    ];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const date = daysAgo(results.length - i);
      const symbol = SYMBOLS[i % SYMBOLS.length];
      const strategy = strategies[i % strategies.length];
      const session = SESSIONS[i % SESSIONS.length];
      const grossPnl = result === "WIN" ? 40 + (i % 5) * 15 : result === "LOSS" ? -(20 + (i % 4) * 12) : 0;
      const fees = 1.5;
      const netPnl = grossPnl - (grossPnl !== 0 ? fees : 0);
      const { pkr, grams } = convertUsdToPkrAndGold(netPnl, usdToPkrRate, goldPricePerGramPkr);

      const trade = await tx.trade.create({
        data: {
          tradingAccountId,
          date,
          time: "09:30",
          session,
          marketType: "FOREX",
          symbol,
          direction: i % 2 === 0 ? "LONG" : "SHORT",
          entryPrice: 100 + i,
          exitPrice: 100 + i + (result === "WIN" ? 1 : -1),
          positionSize: 0.1,
          riskUsd: 25,
          stopLoss: 99 + i,
          takeProfit: 102 + i,
          plannedRR: 2,
          grossPnlUsd: grossPnl,
          feesUsd: grossPnl !== 0 ? fees : 0,
          netPnlUsd: netPnl,
          pnlPkr: pkr,
          goldEquivalentG: grams,
          usdPkrRateAtEntry: usdToPkrRate,
          goldPricePkrAtEntry: goldPricePerGramPkr,
          strategyId: strategy.id,
          setup: "Demo setup",
          timeframe: "H1",
          durationMinutes: 45,
          notes: "Demo trade for illustration purposes.",
          emotion: result === "WIN" ? "Confident" : "Anxious",
          qualityRating: result === "WIN" ? 4 : 2,
          result,
          isDemo: true,
        },
      });

      await recordTransaction(tx, {
        tradingAccountId,
        date,
        type: "TRADE_PNL",
        amountUsd: netPnl,
        relatedTradeId: trade.id,
        notes: "Demo trade P&L",
        isDemo: true,
      });
    }

    const withdrawalDate = daysAgo(5);
    const withdrawal = await tx.withdrawal.create({
      data: {
        tradingAccountId,
        date: withdrawalDate,
        amountUsd: 100,
        pkrEquivalent: 100 * usdToPkrRate,
        usdPkrRateAtEntry: usdToPkrRate,
        destination: "BANK",
        purpose: "Demo withdrawal",
        isDemo: true,
      },
    });
    await recordTransaction(tx, {
      tradingAccountId,
      date: withdrawalDate,
      type: "WITHDRAWAL",
      amountUsd: -100,
      relatedWithdrawalId: withdrawal.id,
      notes: "Demo withdrawal",
      isDemo: true,
    });

    const goldDate = daysAgo(10);
    await tx.goldTransaction.create({
      data: {
        tradingAccountId,
        date: goldDate,
        txType: "BUY",
        goldType: "Coin",
        purity: "24K",
        weightGrams: 5,
        pricePerGramPkr: goldPricePerGramPkr,
        totalCostPkr: 5 * goldPricePerGramPkr,
        usdEquivalent: (5 * goldPricePerGramPkr) / usdToPkrRate,
        usdPkrRateAtEntry: usdToPkrRate,
        dealer: "Demo Dealer",
        notes: "Demo gold purchase",
        isDemo: true,
      },
    });

    const expenseCategories = ["FOOD", "BILLS", "TRAVEL"] as const;
    for (let i = 0; i < 3; i++) {
      await tx.expense.create({
        data: {
          tradingAccountId,
          date: daysAgo(i * 3 + 1),
          category: expenseCategories[i],
          description: "Demo expense",
          amountPkr: 3000 + i * 1500,
          usdEquivalent: (3000 + i * 1500) / usdToPkrRate,
          usdPkrRateAtEntry: usdToPkrRate,
          paymentMethod: "Cash",
          isDemo: true,
        },
      });
    }

    await tx.allocationTransfer.create({
      data: {
        tradingAccountId,
        date: daysAgo(4),
        category: "SAVINGS",
        amountUsd: 50,
        pkrEquivalent: 50 * usdToPkrRate,
        usdPkrRateAtEntry: usdToPkrRate,
        notes: "Demo savings transfer",
        isDemo: true,
      },
    });
  });
}

export async function deleteDemoData(tradingAccountId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.accountTransaction.deleteMany({ where: { tradingAccountId, isDemo: true } });
    await tx.trade.deleteMany({ where: { tradingAccountId, isDemo: true } });
    await tx.strategy.deleteMany({ where: { tradingAccountId, isDemo: true } });
    await tx.withdrawal.deleteMany({ where: { tradingAccountId, isDemo: true } });
    await tx.deposit.deleteMany({ where: { tradingAccountId, isDemo: true } });
    await tx.goldTransaction.deleteMany({ where: { tradingAccountId, isDemo: true } });
    await tx.expense.deleteMany({ where: { tradingAccountId, isDemo: true } });
    await tx.allocationTransfer.deleteMany({ where: { tradingAccountId, isDemo: true } });
    await tx.asset.deleteMany({ where: { tradingAccountId, isDemo: true } });
  });
}
