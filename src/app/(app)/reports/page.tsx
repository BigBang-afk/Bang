import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber, formatUsd, formatPkr, formatGrams, formatPct } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { resolveReportRange } from "@/lib/date-range";
import { getPeriodReport, getSmartInsights } from "@/lib/reports-data";
import { groupTradeStats } from "@/lib/group-stats";
import { getCurrentBalance } from "@/lib/ledger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { ReportRangePicker } from "./report-range-picker";
import { ReportPrintButton } from "@/components/report-print-button";
import { Lightbulb } from "lucide-react";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { account, settings } = await requireAccount();
  const reportType = params.type ?? "trading";
  const { from, to, label } = resolveReportRange(params.range, params.from, params.to);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm text-muted">Professional, printable reports generated from your own recorded data.</p>
        </div>
        <ReportPrintButton />
      </div>

      <div className="no-print">
        <Tabs
          tabs={[
            { value: "trading", label: "Trading" },
            { value: "strategy", label: "Strategy" },
            { value: "gold", label: "Gold" },
            { value: "wealth", label: "Wealth" },
            { value: "expense", label: "Expense" },
          ]}
          defaultTab="trading"
        />
      </div>

      {reportType === "trading" && (
        <>
          <ReportRangePicker />
          <TradingReport tradingAccountId={account.id} from={from} to={to} label={label} countBEasWin={settings.countBreakevenAsWin} />
        </>
      )}
      {reportType === "strategy" && <StrategyReport tradingAccountId={account.id} countBEasWin={settings.countBreakevenAsWin} />}
      {reportType === "gold" && <GoldReport tradingAccountId={account.id} usdToPkrRate={toNumber(settings.usdToPkrRate)} goldPrice={toNumber(settings.goldPricePerGramPkr)} />}
      {reportType === "wealth" && <WealthReport tradingAccountId={account.id} usdToPkrRate={toNumber(settings.usdToPkrRate)} goldPrice={toNumber(settings.goldPricePerGramPkr)} />}
      {reportType === "expense" && <ExpenseReport tradingAccountId={account.id} />}
    </div>
  );
}

async function TradingReport({
  tradingAccountId,
  from,
  to,
  label,
  countBEasWin,
}: {
  tradingAccountId: string;
  from: Date;
  to: Date;
  label: string;
  countBEasWin: boolean;
}) {
  const [report, insights] = await Promise.all([
    getPeriodReport(tradingAccountId, from, to, countBEasWin),
    getSmartInsights(tradingAccountId, countBEasWin),
  ]);

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-muted">{label}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Starting Balance" value={formatUsd(report.startingBalance)} />
        <StatCard label="Ending Balance" value={formatUsd(report.endingBalance)} />
        <StatCard label="Net Trading P&L" value={formatUsd(report.netTradingPnl, { showSign: true })} tone={report.netTradingPnl >= 0 ? "positive" : "negative"} />
        <StatCard label="Return %" value={formatPct(report.returnPct)} tone={report.returnPct >= 0 ? "positive" : "negative"} />
        <StatCard label="Gross Profit" value={formatUsd(report.grossProfit)} tone="positive" />
        <StatCard label="Gross Loss" value={formatUsd(report.grossLoss)} tone="negative" />
        <StatCard label="Fees" value={formatUsd(report.fees)} />
        <StatCard label="Max Drawdown" value={`${formatUsd(report.maxDrawdown)} (${report.maxDrawdownPct.toFixed(1)}%)`} tone="negative" />
        <StatCard label="Total Trades" value={report.totalTrades} />
        <StatCard label="Win Rate" value={formatPct(report.winRate)} />
        <StatCard label="Profit Factor" value={report.profitFactor === null ? "∞" : report.profitFactor.toFixed(2)} />
        <StatCard label="Avg Risk" value={formatUsd(report.avgRisk)} />
        <StatCard label="Deposits" value={formatUsd(report.deposits)} />
        <StatCard label="Withdrawals" value={formatUsd(report.withdrawals)} />
        <StatCard label="Gold Purchased" value={formatGrams(report.goldPurchasedG)} tone="gold" />
        <StatCard label="Savings" value={formatUsd(report.savingsUsd)} />
        <StatCard label="Expenses" value={formatPkr(report.expensesPkr)} tone="negative" />
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3">
          <InfoRow label="Best Strategy" value={report.bestStrategy ?? "—"} />
          <InfoRow label="Worst Strategy" value={report.worstStrategy ?? "—"} />
          <InfoRow label="Best Symbol" value={report.bestSymbol ?? "—"} />
          <InfoRow label="Worst Symbol" value={report.worstSymbol ?? "—"} />
          <InfoRow label="Best Trading Day" value={report.bestDay ? `${formatDate(report.bestDay[0])} (${formatUsd(report.bestDay[1], { showSign: true })})` : "—"} />
          <InfoRow label="Worst Trading Day" value={report.worstDay ? `${formatDate(report.worstDay[0])} (${formatUsd(report.worstDay[1], { showSign: true })})` : "—"} />
          <InfoRow label="Best Trade" value={report.bestTrade ? `${report.bestTrade.symbol} ${formatUsd(report.bestTrade.netPnlUsd, { showSign: true })}` : "—"} />
          <InfoRow label="Worst Trade" value={report.worstTrade ? `${report.worstTrade.symbol} ${formatUsd(report.worstTrade.netPnlUsd, { showSign: true })}` : "—"} />
          <InfoRow label="Net Worth Change" value={formatUsd(report.netWorthChangeUsd, { showSign: true })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb size={16} className="text-gold" /> Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {insights.map((i, idx) => (
            <p key={idx} className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
              {i.text}
            </p>
          ))}
          <p className="pt-1 text-[11px] text-muted-2">
            Insights summarize your historical recorded data only and are not a prediction of future performance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

async function StrategyReport({ tradingAccountId, countBEasWin }: { tradingAccountId: string; countBEasWin: boolean }) {
  const trades = await prisma.trade.findMany({ where: { tradingAccountId, deletedAt: null }, include: { strategy: true } });
  const plain = trades.map((t) => ({
    netPnlUsd: toNumber(t.netPnlUsd),
    result: t.result as "WIN" | "LOSS" | "BREAKEVEN",
    plannedRR: t.plannedRR ? toNumber(t.plannedRR) : null,
    strategy: t.strategy?.name ?? "Unassigned",
  }));
  const grouped = groupTradeStats(plain, (t) => t.strategy, countBEasWin);

  return (
    <Card>
      <Table>
        <THead>
          <TR>
            <TH>Strategy</TH>
            <TH>Trades</TH>
            <TH>Win Rate</TH>
            <TH>Net Profit</TH>
            <TH>Profit Factor</TH>
            <TH>Avg R:R</TH>
          </TR>
        </THead>
        <TBody>
          {Array.from(grouped.entries()).map(([name, s]) => (
            <TR key={name}>
              <TD className="font-medium">{name}</TD>
              <TD>{s.totalTrades}</TD>
              <TD>{formatPct(s.winRate)}</TD>
              <TD className={s.netProfit >= 0 ? "text-positive" : "text-negative"}>{formatUsd(s.netProfit, { showSign: true })}</TD>
              <TD>{s.profitFactor === null ? "∞" : s.profitFactor.toFixed(2)}</TD>
              <TD>{s.avgRR !== null ? s.avgRR.toFixed(2) : "—"}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

async function GoldReport({ tradingAccountId, usdToPkrRate, goldPrice }: { tradingAccountId: string; usdToPkrRate: number; goldPrice: number }) {
  const transactions = await prisma.goldTransaction.findMany({ where: { tradingAccountId }, orderBy: { date: "asc" } });
  let netWeight = 0;
  let totalInvested = 0;
  let totalBuyWeight = 0;
  for (const t of transactions) {
    const w = toNumber(t.weightGrams);
    if (t.txType === "SELL") netWeight -= w;
    else {
      netWeight += w;
      totalBuyWeight += w;
      totalInvested += toNumber(t.totalCostPkr);
    }
  }
  const avgPrice = totalBuyWeight > 0 ? totalInvested / totalBuyWeight : 0;
  const currentValue = netWeight * goldPrice;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Weight" value={formatGrams(netWeight)} tone="gold" />
        <StatCard label="Total Invested" value={formatPkr(totalInvested)} />
        <StatCard label="Average Price" value={formatPkr(avgPrice)} sub="per gram" />
        <StatCard label="Current Value" value={formatPkr(currentValue)} tone="gold" />
      </div>
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Type</TH>
              <TH>Weight (g)</TH>
              <TH>Total (PKR)</TH>
            </TR>
          </THead>
          <TBody>
            {transactions.map((t) => (
              <TR key={t.id}>
                <TD>{formatDate(t.date)}</TD>
                <TD>{t.txType}</TD>
                <TD>{formatGrams(toNumber(t.weightGrams), { valueOnly: true })}</TD>
                <TD>{formatPkr(toNumber(t.totalCostPkr))}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

async function WealthReport({ tradingAccountId, usdToPkrRate, goldPrice }: { tradingAccountId: string; usdToPkrRate: number; goldPrice: number }) {
  const [balance, goldTx, assets] = await Promise.all([
    getCurrentBalance(tradingAccountId),
    prisma.goldTransaction.findMany({ where: { tradingAccountId }, select: { txType: true, weightGrams: true } }),
    prisma.asset.findMany({ where: { tradingAccountId } }),
  ]);
  const goldGrams = goldTx.reduce((sum, g) => sum + (g.txType === "SELL" ? -toNumber(g.weightGrams) : toNumber(g.weightGrams)), 0);
  const goldValuePkr = goldGrams * goldPrice;
  const assetsPkr = assets.reduce((s, a) => s + toNumber(a.valuePkr) + toNumber(a.valueUsd) * usdToPkrRate, 0);
  const netWorthPkr = balance * usdToPkrRate + goldValuePkr + assetsPkr;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Trading" value={formatUsd(balance)} />
        <StatCard label="Gold" value={formatPkr(goldValuePkr)} tone="gold" />
        <StatCard label="Other Assets" value={formatPkr(assetsPkr)} />
        <StatCard label="Net Worth" value={formatPkr(netWorthPkr)} tone="gold" />
      </div>
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Category</TH>
              <TH>Name</TH>
              <TH>PKR</TH>
            </TR>
          </THead>
          <TBody>
            {assets.map((a) => (
              <TR key={a.id}>
                <TD>{a.category.replace("_", " ")}</TD>
                <TD>{a.name}</TD>
                <TD>{formatPkr(toNumber(a.valuePkr) + toNumber(a.valueUsd) * usdToPkrRate)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

async function ExpenseReport({ tradingAccountId }: { tradingAccountId: string }) {
  const expenses = await prisma.expense.findMany({ where: { tradingAccountId }, orderBy: { date: "desc" } });
  const byCategory = new Map<string, number>();
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + toNumber(e.amountPkr));
  const total = Array.from(byCategory.values()).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-4">
      <StatCard label="Total Expenses" value={formatPkr(total)} tone="negative" />
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Category</TH>
              <TH>Total (PKR)</TH>
            </TR>
          </THead>
          <TBody>
            {Array.from(byCategory.entries()).map(([cat, amount]) => (
              <TR key={cat}>
                <TD>{cat.replace("_", " ")}</TD>
                <TD className="text-negative">{formatPkr(amount)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
