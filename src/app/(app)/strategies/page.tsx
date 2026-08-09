import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber, formatUsd, formatPct } from "@/lib/money";
import { groupTradeStats } from "@/lib/group-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { AddStrategyButton, EditStrategyButton, DeleteStrategyButton } from "./strategy-modal";
import { Trophy, TrendingDown } from "lucide-react";

const SESSION_LABELS: Record<string, string> = {
  ASIA: "Asia",
  LONDON: "London",
  NEW_YORK: "New York",
  CUSTOM: "Custom",
};

export default async function StrategiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const { account, settings } = await requireAccount();
  const activeTab = tab ?? "strategies";

  const [strategies, trades] = await Promise.all([
    prisma.strategy.findMany({ where: { tradingAccountId: account.id }, orderBy: { name: "asc" } }),
    prisma.trade.findMany({
      where: { tradingAccountId: account.id, deletedAt: null },
      include: { strategy: true },
    }),
  ]);

  const countBEasWin = settings.countBreakevenAsWin;
  const plainTrades = trades.map((t) => ({
    netPnlUsd: toNumber(t.netPnlUsd),
    result: t.result as "WIN" | "LOSS" | "BREAKEVEN",
    plannedRR: t.plannedRR ? toNumber(t.plannedRR) : null,
    strategyId: t.strategyId,
    session: t.session,
    symbol: t.symbol,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Strategies & Performance Breakdown</h1>
          <p className="text-sm text-muted">Win rate, profit factor and streaks by strategy, session and symbol.</p>
        </div>
        {activeTab === "strategies" && <AddStrategyButton />}
      </div>

      <Tabs
        tabs={[
          { value: "strategies", label: "Strategies" },
          { value: "sessions", label: "Sessions" },
          { value: "symbols", label: "Symbols" },
        ]}
        defaultTab="strategies"
      />

      {activeTab === "strategies" && (
        <div className="space-y-4">
          {strategies.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted">
              No strategies yet. Create one to start tagging your trades.
            </Card>
          ) : (
            strategies.map((s) => {
              const stats = groupTradeStats(
                plainTrades.filter((t) => t.strategyId === s.id),
                () => "x",
                countBEasWin
              ).get("x");
              return (
                <Card key={s.id}>
                  <CardHeader>
                    <div>
                      <CardTitle>{s.name}</CardTitle>
                      {s.description && <p className="mt-0.5 text-xs text-muted">{s.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <EditStrategyButton id={s.id} name={s.name} description={s.description ?? ""} />
                      <DeleteStrategyButton id={s.id} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!stats || stats.totalTrades === 0 ? (
                      <p className="text-sm text-muted">No trades logged for this strategy yet.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                        <Metric label="Trades" value={stats.totalTrades} />
                        <Metric label="Win Rate" value={formatPct(stats.winRate)} />
                        <Metric label="Net Profit" value={formatUsd(stats.netProfit, { showSign: true })} tone={stats.netProfit >= 0 ? "positive" : "negative"} />
                        <Metric label="Profit Factor" value={stats.profitFactor === null ? "∞" : stats.profitFactor.toFixed(2)} />
                        <Metric label="Avg Win" value={formatUsd(stats.avgWin)} tone="positive" />
                        <Metric label="Avg Loss" value={formatUsd(stats.avgLoss)} tone="negative" />
                        <Metric label="Avg R:R" value={stats.avgRR !== null ? stats.avgRR.toFixed(2) : "—"} />
                        <Metric label="Largest Win" value={formatUsd(stats.largestWin)} tone="positive" />
                        <Metric label="Largest Loss" value={formatUsd(stats.largestLoss)} tone="negative" />
                        <Metric label="Max Win Streak" value={stats.maxWinStreak} />
                        <Metric label="Max Loss Streak" value={stats.maxLossStreak} />
                        <Metric label="Wins / Losses / BE" value={`${stats.wins} / ${stats.losses} / ${stats.breakeven}`} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {activeTab === "sessions" && (
        <SessionsTab trades={plainTrades} countBEasWin={countBEasWin} />
      )}

      {activeTab === "symbols" && (
        <SymbolsTab trades={plainTrades} countBEasWin={countBEasWin} />
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "positive" | "negative" }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className={`text-sm font-semibold ${tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function SessionsTab({
  trades,
  countBEasWin,
}: {
  trades: { netPnlUsd: number; result: "WIN" | "LOSS" | "BREAKEVEN"; plannedRR: number | null; session: string | null }[];
  countBEasWin: boolean;
}) {
  const grouped = groupTradeStats(
    trades.filter((t) => t.session),
    (t) => t.session!,
    countBEasWin
  );
  const entries = Array.from(grouped.entries()).sort((a, b) => b[1].netProfit - a[1].netProfit);
  const best = entries[0];
  const worst = entries[entries.length - 1];

  return (
    <div className="space-y-4">
      {entries.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border-positive/30">
            <CardContent className="flex items-center gap-4 p-5">
              <Trophy className="text-positive" size={28} />
              <div>
                <p className="text-xs text-muted">Best Session</p>
                <p className="text-lg font-semibold">{SESSION_LABELS[best[0]] ?? best[0]}</p>
                <p className="text-sm text-positive">
                  {formatUsd(best[1].netProfit, { showSign: true })} · {formatPct(best[1].winRate)} win rate
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-negative/30">
            <CardContent className="flex items-center gap-4 p-5">
              <TrendingDown className="text-negative" size={28} />
              <div>
                <p className="text-xs text-muted">Worst Session</p>
                <p className="text-lg font-semibold">{SESSION_LABELS[worst[0]] ?? worst[0]}</p>
                <p className="text-sm text-negative">
                  {formatUsd(worst[1].netProfit, { showSign: true })} · {formatPct(worst[1].winRate)} win rate
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Session</TH>
              <TH>Trades</TH>
              <TH>Win Rate</TH>
              <TH>Net Profit</TH>
              <TH>Profit Factor</TH>
            </TR>
          </THead>
          <TBody>
            {entries.map(([key, s]) => (
              <TR key={key}>
                <TD className="font-medium">{SESSION_LABELS[key] ?? key}</TD>
                <TD>{s.totalTrades}</TD>
                <TD>{formatPct(s.winRate)}</TD>
                <TD className={s.netProfit >= 0 ? "text-positive" : "text-negative"}>{formatUsd(s.netProfit, { showSign: true })}</TD>
                <TD>{s.profitFactor === null ? "∞" : s.profitFactor.toFixed(2)}</TD>
              </TR>
            ))}
            {entries.length === 0 && (
              <TR>
                <TD colSpan={5} className="py-8 text-center text-muted">
                  No session data yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function SymbolsTab({
  trades,
  countBEasWin,
}: {
  trades: { netPnlUsd: number; result: "WIN" | "LOSS" | "BREAKEVEN"; plannedRR: number | null; symbol: string }[];
  countBEasWin: boolean;
}) {
  const grouped = groupTradeStats(trades, (t) => t.symbol, countBEasWin);
  const entries = Array.from(grouped.entries());
  const bestPerforming = [...entries].sort((a, b) => b[1].netProfit - a[1].netProfit)[0];
  const worstPerforming = [...entries].sort((a, b) => a[1].netProfit - b[1].netProfit)[0];
  const mostTraded = [...entries].sort((a, b) => b[1].totalTrades - a[1].totalTrades)[0];
  const mostProfitable = bestPerforming;

  return (
    <div className="space-y-4">
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Best Performing Pair" value={bestPerforming?.[0] ?? "—"} tone="positive" />
          <StatCard label="Worst Performing Pair" value={worstPerforming?.[0] ?? "—"} tone="negative" />
          <StatCard label="Most Traded Pair" value={mostTraded?.[0] ?? "—"} />
          <StatCard label="Most Profitable Pair" value={mostProfitable?.[0] ?? "—"} tone="gold" />
        </div>
      )}
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Symbol</TH>
              <TH>Trades</TH>
              <TH>Wins</TH>
              <TH>Losses</TH>
              <TH>Win Rate</TH>
              <TH>Net Profit</TH>
            </TR>
          </THead>
          <TBody>
            {entries
              .sort((a, b) => b[1].netProfit - a[1].netProfit)
              .map(([key, s]) => (
                <TR key={key}>
                  <TD className="font-medium">{key}</TD>
                  <TD>{s.totalTrades}</TD>
                  <TD className="text-positive">{s.wins}</TD>
                  <TD className="text-negative">{s.losses}</TD>
                  <TD>{formatPct(s.winRate)}</TD>
                  <TD className={s.netProfit >= 0 ? "text-positive" : "text-negative"}>{formatUsd(s.netProfit, { showSign: true })}</TD>
                </TR>
              ))}
            {entries.length === 0 && (
              <TR>
                <TD colSpan={6} className="py-8 text-center text-muted">
                  No symbol data yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
