import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber, formatUsd, formatPkr, formatGrams } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { GoldRowActions } from "./gold-row-actions";
import { Plus } from "lucide-react";

export default async function GoldPortfolioPage() {
  const { account, settings } = await requireAccount();
  const transactions = await prisma.goldTransaction.findMany({
    where: { tradingAccountId: account.id },
    orderBy: { date: "desc" },
  });

  let netWeight = 0;
  let totalBuyWeight = 0;
  let totalInvestedPkr = 0;
  for (const t of transactions) {
    const w = toNumber(t.weightGrams);
    if (t.txType === "SELL") {
      netWeight -= w;
    } else {
      netWeight += w;
      totalBuyWeight += w;
      totalInvestedPkr += toNumber(t.totalCostPkr);
    }
  }

  const currentGoldPrice = toNumber(settings.goldPricePerGramPkr);
  const avgPurchasePricePkr = totalBuyWeight > 0 ? totalInvestedPkr / totalBuyWeight : 0;
  const currentValuePkr = netWeight * currentGoldPrice;
  const currentValueUsd = toNumber(settings.usdToPkrRate) > 0 ? currentValuePkr / toNumber(settings.usdToPkrRate) : 0;
  const costBasisRemaining = avgPurchasePricePkr * netWeight;
  const unrealizedGainLoss = currentValuePkr - costBasisRemaining;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Gold Portfolio</h1>
          <p className="text-sm text-muted">Only manually confirmed purchases count toward your physical gold holdings.</p>
        </div>
        <LinkButton href="/gold/new" size="sm">
          <Plus size={16} /> Buy Gold
        </LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Gold Weight" value={formatGrams(netWeight)} tone="gold" />
        <StatCard label="Current Estimated Value" value={formatPkr(currentValuePkr)} />
        <StatCard label="USD Value" value={formatUsd(currentValueUsd)} />
        <StatCard label="Average Purchase Price" value={formatPkr(avgPurchasePricePkr)} sub="per gram" />
        <StatCard label="Total Invested" value={formatPkr(totalInvestedPkr)} />
        <StatCard
          label="Est. Unrealized Gain/Loss"
          value={formatPkr(unrealizedGainLoss, { showSign: true })}
          tone={unrealizedGainLoss >= 0 ? "positive" : "negative"}
        />
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Type</TH>
              <TH>Purity</TH>
              <TH>Weight (g)</TH>
              <TH>Price/g (PKR)</TH>
              <TH>Total (PKR)</TH>
              <TH>USD</TH>
              <TH>Dealer</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {transactions.map((t) => (
              <TR key={t.id}>
                <TD>{formatDate(t.date)}</TD>
                <TD>
                  <Badge variant={t.txType === "BUY" ? "positive" : "negative"}>{t.txType}</Badge>
                </TD>
                <TD>{t.purity === "CUSTOM" ? t.purityCustomLabel : t.purity}</TD>
                <TD className="text-gold">{formatGrams(toNumber(t.weightGrams), { valueOnly: true })}</TD>
                <TD>{formatPkr(toNumber(t.pricePerGramPkr))}</TD>
                <TD className="font-medium">{formatPkr(toNumber(t.totalCostPkr))}</TD>
                <TD className="text-muted">{formatUsd(toNumber(t.usdEquivalent))}</TD>
                <TD className="text-muted">{t.dealer ?? "—"}</TD>
                <TD>
                  <GoldRowActions id={t.id} />
                </TD>
              </TR>
            ))}
            {transactions.length === 0 && (
              <TR>
                <TD colSpan={9} className="py-10 text-center text-muted">
                  No gold purchases recorded yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
