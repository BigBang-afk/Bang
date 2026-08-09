import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber, formatUsd, formatPkr, formatGrams } from "@/lib/money";
import { getCurrentBalance } from "@/lib/ledger";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CategoryPie } from "@/components/charts/category-pie";
import { AddAssetButton, EditAssetButton, DeleteAssetButton } from "./asset-modal";
import { LinkButton } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK: "Bank",
  CRYPTO: "Crypto",
  BUSINESS: "Business",
  REAL_ESTATE: "Real Estate",
  OTHER: "Other Assets",
};

export default async function WealthPage() {
  const { account, settings } = await requireAccount();

  const [assets, goldTx, balance] = await Promise.all([
    prisma.asset.findMany({ where: { tradingAccountId: account.id }, orderBy: { category: "asc" } }),
    prisma.goldTransaction.findMany({ where: { tradingAccountId: account.id }, select: { txType: true, weightGrams: true } }),
    getCurrentBalance(account.id),
  ]);

  const rate = toNumber(settings.usdToPkrRate);
  const goldPrice = toNumber(settings.goldPricePerGramPkr);
  const goldGrams = goldTx.reduce((sum, g) => sum + (g.txType === "SELL" ? -toNumber(g.weightGrams) : toNumber(g.weightGrams)), 0);
  const goldValuePkr = goldGrams * goldPrice;
  const goldValueUsd = rate > 0 ? goldValuePkr / rate : 0;
  const tradingValuePkr = balance * rate;

  const categoryTotalsPkr = new Map<string, number>();
  for (const a of assets) {
    categoryTotalsPkr.set(a.category, (categoryTotalsPkr.get(a.category) ?? 0) + toNumber(a.valuePkr) + toNumber(a.valueUsd) * rate);
  }

  const netWorthPkr = tradingValuePkr + goldValuePkr + Array.from(categoryTotalsPkr.values()).reduce((s, v) => s + v, 0);
  const netWorthUsd = rate > 0 ? netWorthPkr / rate : 0;

  const allocationData = [
    { name: "Trading", value: tradingValuePkr },
    { name: "Gold", value: goldValuePkr },
    ...Array.from(categoryTotalsPkr.entries()).map(([cat, value]) => ({ name: CATEGORY_LABELS[cat] ?? cat, value })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">My Wealth</h1>
          <p className="text-sm text-muted">A complete picture of everything you own.</p>
        </div>
        <AddAssetButton />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total Net Worth (USD)" value={formatUsd(netWorthUsd)} tone="gold" />
        <StatCard label="Total Net Worth (PKR)" value={formatPkr(netWorthPkr)} tone="gold" />
        <StatCard label="Physical Gold" value={formatGrams(goldGrams)} tone="gold" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Wealth Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPie data={allocationData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span>Trading Account</span>
              <span className="font-medium">{formatUsd(balance)} · {formatPkr(tradingValuePkr)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span>Physical Gold</span>
              <span className="font-medium text-gold">{formatGrams(goldGrams)} · {formatPkr(goldValuePkr)}</span>
            </div>
            {Array.from(categoryTotalsPkr.entries()).map(([cat, value]) => (
              <div key={cat} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span>{CATEGORY_LABELS[cat] ?? cat}</span>
                <span className="font-medium">{formatPkr(value)}</span>
              </div>
            ))}
            <LinkButton href="/gold" variant="outline" size="sm" className="mt-2 w-full justify-center">
              Manage Gold Portfolio <ArrowRight size={14} />
            </LinkButton>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Category</TH>
              <TH>Name</TH>
              <TH>USD</TH>
              <TH>PKR</TH>
              <TH>Notes</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {assets.map((a) => (
              <TR key={a.id}>
                <TD>
                  <Badge variant="accent">{CATEGORY_LABELS[a.category] ?? a.category}</Badge>
                </TD>
                <TD className="font-medium">{a.name}</TD>
                <TD>{formatUsd(toNumber(a.valueUsd))}</TD>
                <TD>{formatPkr(toNumber(a.valuePkr))}</TD>
                <TD className="max-w-40 truncate text-muted">{a.notes ?? "—"}</TD>
                <TD>
                  <div className="flex items-center gap-1">
                    <EditAssetButton
                      asset={{ id: a.id, category: a.category, name: a.name, valueUsd: toNumber(a.valueUsd), valuePkr: toNumber(a.valuePkr), notes: a.notes ?? "" }}
                    />
                    <DeleteAssetButton id={a.id} />
                  </div>
                </TD>
              </TR>
            ))}
            {assets.length === 0 && (
              <TR>
                <TD colSpan={6} className="py-10 text-center text-muted">
                  No other assets recorded yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
