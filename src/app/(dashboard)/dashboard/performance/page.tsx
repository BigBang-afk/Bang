import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { EquityCurveChart } from "@/components/dashboard/equity-curve-chart";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { computePerformanceStats, type ClosedTradeInput } from "@/lib/trading/performance";

export const metadata: Metadata = { title: "Performance" };

function formatDollars(cents: number | null): string {
  if (cents === null) return "—";
  const dollars = cents / 100;
  const abs = Math.abs(dollars).toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (dollars > 0) return `+$${abs}`;
  if (dollars < 0) return `-$${abs}`;
  return `$${abs}`;
}

function StatTile({
  label,
  value,
  valueClassName,
  hint,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-xl font-semibold ${valueClassName ?? ""}`}>{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function PerformancePage() {
  const profile = await requireUser("/dashboard/performance");
  const supabase = await createClient();

  const { data: closedTrades } = await supabase
    .from("trade_journal")
    .select("pnl_cents, risk_amount_cents, closed_at")
    .eq("user_id", profile.id)
    .eq("status", "closed")
    .not("closed_at", "is", null)
    .order("closed_at", { ascending: true });

  const trades: ClosedTradeInput[] = (closedTrades ?? [])
    .filter((t) => t.pnl_cents !== null && t.closed_at !== null)
    .map((t) => ({
      pnlCents: t.pnl_cents!,
      riskAmountCents: t.risk_amount_cents,
      closedAt: t.closed_at!,
    }));

  const stats = computePerformanceStats(trades);

  return (
    <div>
      <PageHeader
        title="Performance"
        description="Computed from your closed trade journal entries. Past performance does not guarantee future results — these numbers describe what already happened, not what will happen next."
      />

      {stats.totalTrades === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No closed trades yet"
          description="Log trades in your journal and close them out — performance stats and your equity curve will appear here once you have closed trades with a recorded exit."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="Total trades" value={String(stats.totalTrades)} />
            <StatTile
              label="Winning trades"
              value={String(stats.winningTrades)}
              valueClassName="text-success"
            />
            <StatTile
              label="Losing trades"
              value={String(stats.losingTrades)}
              valueClassName="text-danger"
            />
            <StatTile
              label="Win rate"
              value={stats.winRate !== null ? `${stats.winRate.toFixed(1)}%` : "—"}
            />
            <StatTile
              label="Profit factor"
              value={stats.profitFactor !== null ? stats.profitFactor.toFixed(2) : "—"}
              hint={stats.profitFactor === null ? "No losing trades yet" : undefined}
            />
            <StatTile
              label="Average win"
              value={formatDollars(stats.avgWinCents)}
              valueClassName="text-success"
            />
            <StatTile
              label="Average loss"
              value={stats.avgLossCents !== null ? formatDollars(-stats.avgLossCents) : "—"}
              valueClassName="text-danger"
            />
            <StatTile
              label="Average R"
              value={stats.avgR !== null ? `${stats.avgR.toFixed(2)}R` : "—"}
              hint={
                stats.avgR !== null
                  ? `From ${stats.rSampleSize} trade${stats.rSampleSize === 1 ? "" : "s"} with risk recorded`
                  : "Log a risk amount on your trades to see this"
              }
            />
            <StatTile label="Max drawdown" value={formatDollars(-stats.maxDrawdownCents)} valueClassName="text-danger" />
            <StatTile
              label="Net P/L"
              value={formatDollars(stats.netPnlCents)}
              valueClassName={stats.netPnlCents >= 0 ? "text-success" : "text-danger"}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Equity curve</CardTitle>
            </CardHeader>
            <CardContent>
              <EquityCurveChart equityCurve={stats.equityCurve} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
