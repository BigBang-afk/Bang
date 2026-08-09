import Link from "next/link";
import { requireAccount } from "@/lib/require-auth";
import { getDashboardData } from "@/lib/dashboard-data";
import { toNumber, formatUsd, formatPkr, formatGrams, formatPct } from "@/lib/money";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Wallet, TrendingUp, TrendingDown, Coins, PiggyBank, Landmark, ArrowRight } from "lucide-react";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default async function DashboardPage() {
  const { user, account, settings } = await requireAccount();
  const data = await getDashboardData(account.id, settings.countBreakevenAsWin);

  const rate = toNumber(settings.usdToPkrRate);
  const goldPrice = toNumber(settings.goldPricePerGramPkr);
  const netWorthPkr = data.balance * rate + data.goldGrams * goldPrice + data.savingsPkr + data.otherAssetsPkr;

  const plan = data.dailyPlan;
  const targetUsd = plan ? toNumber(plan.dailyTargetUsd) : null;
  const maxLossUsd = plan ? toNumber(plan.dailyMaxLossUsd) : null;
  const targetProgress = targetUsd ? Math.max(0, (data.todayPnlUsd / targetUsd) * 100) : 0;
  const lossUsed = maxLossUsd ? Math.max(0, -data.todayPnlUsd) : 0;
  const lossProgress = maxLossUsd ? (lossUsed / maxLossUsd) * 100 : 0;
  const targetHit = targetUsd !== null && data.todayPnlUsd >= targetUsd;
  const lossLimitHit = maxLossUsd !== null && lossUsed >= maxLossUsd;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {greeting()}, {user.traderName}
        </h1>
        <p className="text-sm text-muted">Here&apos;s where your trading capital and wealth stand today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Account Balance" value={formatUsd(data.balance)} icon={<Wallet size={16} />} />
        <StatCard
          label="Today's P&L"
          value={formatUsd(data.todayPnlUsd, { showSign: true })}
          tone={data.todayPnlUsd > 0 ? "positive" : data.todayPnlUsd < 0 ? "negative" : "neutral"}
          icon={data.todayPnlUsd >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        />
        <StatCard
          label="Today's P&L (PKR)"
          value={formatPkr(data.todayPnlPkr, { showSign: true })}
          tone={data.todayPnlPkr > 0 ? "positive" : data.todayPnlPkr < 0 ? "negative" : "neutral"}
        />
        <StatCard
          label="Today's Gold Equivalent"
          value={formatGrams(Math.abs(data.todayGoldG))}
          tone="gold"
          icon={<Coins size={16} />}
        />
        <StatCard
          label="This Week"
          value={formatUsd(data.weekNet, { showSign: true })}
          tone={data.weekNet > 0 ? "positive" : data.weekNet < 0 ? "negative" : "neutral"}
        />
        <StatCard
          label="This Month"
          value={formatUsd(data.monthNet, { showSign: true })}
          tone={data.monthNet > 0 ? "positive" : data.monthNet < 0 ? "negative" : "neutral"}
        />
        <StatCard label="Total Profit" value={formatUsd(data.totalProfit)} tone="positive" />
        <StatCard label="Total Loss" value={formatUsd(data.totalLoss)} tone="negative" />
        <StatCard
          label="Net Profit"
          value={formatUsd(data.netProfit, { showSign: true })}
          tone={data.netProfit > 0 ? "positive" : data.netProfit < 0 ? "negative" : "neutral"}
        />
        <StatCard label="Total Withdrawn" value={formatUsd(data.totalWithdrawn)} icon={<PiggyBank size={16} />} />
        <StatCard label="Current Capital" value={formatUsd(data.currentCapital)} />
        <StatCard label="Total Wealth Generated" value={formatUsd(data.totalWealthGenerated)} tone="gold" icon={<Landmark size={16} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Trading Plan</CardTitle>
            <Link href="/daily-plan" className="text-xs font-medium text-accent hover:underline">
              Manage plan <ArrowRight size={12} className="inline" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {!plan ? (
              <div className="rounded-lg border border-dashed border-border-strong p-6 text-center text-sm text-muted">
                No trading plan set for today.
                <div className="mt-3">
                  <LinkButton href="/daily-plan" size="sm">
                    Set Today&apos;s Plan
                  </LinkButton>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">Daily Profit Target</span>
                    <span className="font-medium">
                      {formatUsd(Math.max(0, data.todayPnlUsd))} / {formatUsd(targetUsd ?? 0)}
                    </span>
                  </div>
                  <Progress value={targetProgress} colorClassName="bg-positive" />
                  <p className="mt-1 text-[11px] text-muted">{formatPct(Math.min(100, targetProgress))} completed</p>
                  {targetHit && <Badge variant="positive" className="mt-2">✅ Daily Target Achieved — consider ending today&apos;s session</Badge>}
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">Daily Loss Limit</span>
                    <span className="font-medium">
                      {formatUsd(lossUsed)} / {formatUsd(maxLossUsd ?? 0)}
                    </span>
                  </div>
                  <Progress value={lossProgress} colorClassName="bg-negative" />
                  <p className="mt-1 text-[11px] text-muted">{formatPct(Math.min(100, lossProgress))} used</p>
                  {lossLimitHit && <Badge variant="negative" className="mt-2">🛑 Daily Loss Limit Reached — trading stopped for today</Badge>}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-xs">
                  <span className="text-muted">Trades Today</span>
                  <span className="font-medium">{data.todaysTradesCount} / {plan.maxTrades}</span>
                </div>
                {data.currentLossStreak > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-xs">
                    <span className="text-muted">Consecutive Losses</span>
                    <span className={data.currentLossStreak >= plan.maxConsecutiveLosses ? "font-medium text-negative" : "font-medium"}>
                      {data.currentLossStreak} / {plan.maxConsecutiveLosses}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This Month</CardTitle>
            <Link href="/analytics" className="text-xs font-medium text-accent hover:underline">
              Full analytics <ArrowRight size={12} className="inline" />
            </Link>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted">Profit</p>
              <p className={`text-lg font-semibold ${data.monthNet >= 0 ? "text-positive" : "text-negative"}`}>
                {formatUsd(data.monthNet, { showSign: true })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Win Rate</p>
              <p className="text-lg font-semibold">{formatPct(data.monthStats.winRate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Trades</p>
              <p className="text-lg font-semibold">{data.monthStats.totalTrades}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Best Strategy</p>
              <p className="text-lg font-semibold">{data.bestStrategy ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wealth Snapshot</CardTitle>
          <Link href="/wealth" className="text-xs font-medium text-accent hover:underline">
            Full wealth dashboard <ArrowRight size={12} className="inline" />
          </Link>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Trading</p>
            <p className="text-lg font-semibold">{formatUsd(data.balance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Gold</p>
            <p className="text-lg font-semibold text-gold">{formatGrams(data.goldGrams)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Savings</p>
            <p className="text-lg font-semibold">{formatPkr(data.savingsPkr)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Estimated Net Worth</p>
            <p className="text-lg font-semibold text-gold">{formatPkr(netWorthPkr)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
