import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { TradeForm } from "../trade-form";

export default async function NewTradePage() {
  const { account, settings } = await requireAccount();
  const strategies = await prisma.strategy.findMany({
    where: { tradingAccountId: account.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Add Trade</h1>
        <p className="text-sm text-muted">Log a new trade to your journal.</p>
      </div>
      <TradeForm
        strategies={strategies}
        usdToPkrRate={toNumber(settings.usdToPkrRate)}
        goldPricePerGramPkr={toNumber(settings.goldPricePerGramPkr)}
      />
    </div>
  );
}
