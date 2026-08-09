import { requireAccount } from "@/lib/require-auth";
import { getAnalyticsData } from "@/lib/analytics-data";
import { formatUsd, formatPct } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { PnlBarChart } from "@/components/charts/pnl-bar-chart";
import { WinLossPie } from "@/components/charts/win-loss-pie";
import { HorizontalPnlChart } from "@/components/charts/horizontal-pnl-chart";

export default async function AnalyticsPage() {
  const { account, settings } = await requireAccount();
  const data = await getAnalyticsData(account.id, settings.countBreakevenAsWin);
  const s = data.overallStats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Performance Analytics</h1>
        <p className="text-sm text-muted">Every metric below is computed from your own recorded trades.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Win Rate" value={formatPct(s.winRate)} />
        <StatCard label="Profit Factor" value={s.profitFactor === null ? "∞" : s.profitFactor.toFixed(2)} />
        <StatCard label="Expectancy" value={formatUsd(s.expectancy, { showSign: true })} tone={s.expectancy >= 0 ? "positive" : "negative"} />
        <StatCard label="Avg Win" value={formatUsd(s.avgWin)} tone="positive" />
        <StatCard label="Avg Loss" value={formatUsd(s.avgLoss)} tone="negative" />
        <StatCard label="Avg R:R" value={s.avgRR !== null ? s.avgRR.toFixed(2) : "—"} />
        <StatCard label="Max Drawdown" value={formatUsd(data.drawdown.maxDrawdown)} tone="negative" sub={`${data.drawdown.maxDrawdownPct.toFixed(1)}%`} />
        <StatCard label="Current Drawdown" value={formatUsd(data.drawdown.currentDrawdown)} tone={data.drawdown.currentDrawdown > 0 ? "negative" : "neutral"} sub={`${data.drawdown.currentDrawdownPct.toFixed(1)}%`} />
        <StatCard label="Max Win Streak" value={s.maxWinStreak} tone="positive" />
        <StatCard label="Max Loss Streak" value={s.maxLossStreak} tone="negative" />
        <StatCard label="Total Trades" value={s.totalTrades} />
        <StatCard label="Net Profit" value={formatUsd(s.netProfit, { showSign: true })} tone={s.netProfit >= 0 ? "positive" : "negative"} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <BestWorstCard label="Best Day" item={data.bestDay ? { label: formatDate(data.bestDay.date), value: data.bestDay.net } : null} tone="positive" />
        <BestWorstCard label="Worst Day" item={data.worstDay ? { label: formatDate(data.worstDay.date), value: data.worstDay.net } : null} tone="negative" />
        <BestWorstCard label="Best Week" item={data.bestWeek ? { label: `Week of ${formatDate(data.bestWeek.weekStart)}`, value: data.bestWeek.net } : null} tone="positive" />
        <BestWorstCard label="Worst Week" item={data.worstWeek ? { label: `Week of ${formatDate(data.worstWeek.weekStart)}`, value: data.worstWeek.net } : null} tone="negative" />
        <BestWorstCard label="Best Month" item={data.bestMonth ? { label: data.bestMonth.month, value: data.bestMonth.net } : null} tone="positive" />
        <BestWorstCard label="Worst Month" item={data.worstMonth ? { label: data.worstMonth.month, value: data.worstMonth.net } : null} tone="negative" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <EquityCurveChart data={data.equityCurve} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <PnlBarChart data={data.dailyPnl} xKey="date" yKey="net" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Win / Loss Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <WinLossPie wins={s.wins} losses={s.losses} breakeven={s.breakeven} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <PnlBarChart data={data.weeklyPnl} xKey="weekStart" yKey="net" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <PnlBarChart data={data.monthlyPnl} xKey="month" yKey="net" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Strategy Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalPnlChart data={data.strategyStats.map((s) => ({ name: s.name, netProfit: s.netProfit }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Symbol Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalPnlChart data={data.symbolStats.map((s) => ({ name: s.name, netProfit: s.netProfit }))} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BestWorstCard({
  label,
  item,
  tone,
}: {
  label: string;
  item: { label: string; value: number } | null;
  tone: "positive" | "negative";
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      {item ? (
        <>
          <p className={`mt-1 text-lg font-semibold ${tone === "positive" ? "text-positive" : "text-negative"}`}>
            {formatUsd(item.value, { showSign: true })}
          </p>
          <p className="text-xs text-muted">{item.label}</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">—</p>
      )}
    </Card>
  );
}
