import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { toDateInputValue } from "@/lib/utils";
import { TradeForm } from "../../trade-form";

export default async function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account, settings } = await requireAccount();

  const [trade, strategies] = await Promise.all([
    prisma.trade.findFirst({ where: { id, tradingAccountId: account.id, deletedAt: null } }),
    prisma.strategy.findMany({ where: { tradingAccountId: account.id }, orderBy: { name: "asc" } }),
  ]);

  if (!trade) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit Trade</h1>
        <p className="text-sm text-muted">
          {trade.symbol} · {toDateInputValue(trade.date)}
        </p>
      </div>
      <TradeForm
        strategies={strategies}
        usdToPkrRate={toNumber(settings.usdToPkrRate)}
        goldPricePerGramPkr={toNumber(settings.goldPricePerGramPkr)}
        initial={{
          id: trade.id,
          date: toDateInputValue(trade.date),
          time: trade.time ?? "",
          session: trade.session ?? "",
          customSession: trade.customSession ?? "",
          broker: trade.broker ?? "",
          marketType: trade.marketType,
          symbol: trade.symbol,
          direction: trade.direction,
          entryPrice: trade.entryPrice ? toNumber(trade.entryPrice).toString() : "",
          exitPrice: trade.exitPrice ? toNumber(trade.exitPrice).toString() : "",
          positionSize: trade.positionSize ? toNumber(trade.positionSize).toString() : "",
          riskUsd: trade.riskUsd ? toNumber(trade.riskUsd).toString() : "",
          stopLoss: trade.stopLoss ? toNumber(trade.stopLoss).toString() : "",
          takeProfit: trade.takeProfit ? toNumber(trade.takeProfit).toString() : "",
          plannedRR: trade.plannedRR ? toNumber(trade.plannedRR).toString() : "",
          grossPnlUsd: toNumber(trade.grossPnlUsd).toString(),
          feesUsd: toNumber(trade.feesUsd).toString(),
          useNetOverride: false,
          netPnlOverride: "",
          strategyId: trade.strategyId ?? "",
          setup: trade.setup ?? "",
          timeframe: trade.timeframe ?? "",
          durationMinutes: trade.durationMinutes ? trade.durationMinutes.toString() : "",
          screenshotUrl: trade.screenshotUrl,
          notes: trade.notes ?? "",
          emotion: trade.emotion ?? "",
          qualityRating: trade.qualityRating ? trade.qualityRating.toString() : "",
          result: trade.result,
        }}
      />
    </div>
  );
}
