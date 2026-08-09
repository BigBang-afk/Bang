import { requireAccount } from "@/lib/require-auth";
import { getDailyPlanData } from "@/lib/daily-plan-data";
import { toNumber, formatUsd, formatPct } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ResultBadge } from "@/components/ui/badge";
import { DailyPlanForm } from "./daily-plan-form";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default async function DailyPlanPage() {
  const { account, settings } = await requireAccount();
  const data = await getDailyPlanData(account.id);
  const plan = data.plan;

  const targetUsd = plan ? toNumber(plan.dailyTargetUsd) : 0;
  const maxLossUsd = plan ? toNumber(plan.dailyMaxLossUsd) : 0;
  const targetProgress = targetUsd > 0 ? Math.max(0, (data.netPnlToday / targetUsd) * 100) : 0;
  const lossUsed = Math.max(0, -data.netPnlToday);
  const lossProgress = maxLossUsd > 0 ? (lossUsed / maxLossUsd) * 100 : 0;
  const targetHit = plan && data.netPnlToday >= targetUsd && targetUsd > 0;
  const lossLimitHit = plan && lossUsed >= maxLossUsd && maxLossUsd > 0;

  const maxTradesReached = plan && data.tradesCount >= plan.maxTrades;
  const consecutiveLossLimitReached = plan && data.currentLossStreak >= plan.maxConsecutiveLosses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Today&apos;s Trading Plan</h1>
        <p className="text-sm text-muted">Set your daily risk boundaries before you start trading.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DailyPlanForm
          initial={{
            startingBalance: plan ? toNumber(plan.startingBalance) : data.balance,
            dailyTargetPct: plan ? toNumber(plan.dailyTargetPct) : toNumber(settings.defaultDailyTargetPct),
            dailyMaxLossPct: plan ? toNumber(plan.dailyMaxLossPct) : toNumber(settings.defaultDailyLossPct),
            riskPerTradePct: plan ? toNumber(plan.riskPerTradePct) : toNumber(settings.defaultRiskPct),
            maxTrades: plan ? plan.maxTrades : settings.defaultMaxTrades,
            maxConsecutiveLosses: plan ? plan.maxConsecutiveLosses : settings.defaultMaxConsecutiveLosses,
            session1Target: plan?.session1Target ? toNumber(plan.session1Target) : null,
            session2Target: plan?.session2Target ? toNumber(plan.session2Target) : null,
            notes: plan?.notes ?? "",
          }}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Safety System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {!plan ? (
                <p className="text-sm text-muted">Save today&apos;s plan to activate the safety system.</p>
              ) : (
                <>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted">Daily Profit Target</span>
                      <span className="font-medium">
                        {formatUsd(Math.max(0, data.netPnlToday))} / {formatUsd(targetUsd)}
                      </span>
                    </div>
                    <Progress value={targetProgress} colorClassName="bg-positive" />
                    <p className="mt-1 text-[11px] text-muted">{formatPct(Math.min(100, targetProgress))} completed</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted">Daily Loss Limit</span>
                      <span className="font-medium">
                        {formatUsd(lossUsed)} / {formatUsd(maxLossUsd)}
                      </span>
                    </div>
                    <Progress value={lossProgress} colorClassName="bg-negative" />
                    <p className="mt-1 text-[11px] text-muted">{formatPct(Math.min(100, lossProgress))} used</p>
                  </div>

                  {targetHit && (
                    <div className="flex items-start gap-2 rounded-lg border border-positive/30 bg-positive-bg p-3 text-sm text-positive">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">DAILY TARGET ACHIEVED</p>
                        <p className="text-xs opacity-80">Consider ending today&apos;s trading session.</p>
                      </div>
                    </div>
                  )}
                  {lossLimitHit && (
                    <div className="flex items-start gap-2 rounded-lg border border-negative/30 bg-negative-bg p-3 text-sm text-negative">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">DAILY LOSS LIMIT REACHED</p>
                        <p className="text-xs opacity-80">
                          Trading should be marked as stopped for today. Past losses are not guaranteed to be recoverable — protect your capital.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overtrading Protection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="text-muted">Trades Today</span>
                <span className={maxTradesReached ? "font-semibold text-negative" : "font-semibold"}>
                  {data.tradesCount} / {plan?.maxTrades ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="text-muted">Consecutive Losses</span>
                <span className={consecutiveLossLimitReached ? "font-semibold text-negative" : "font-semibold"}>
                  {data.currentLossStreak} / {plan?.maxConsecutiveLosses ?? "—"}
                </span>
              </div>
              {maxTradesReached && (
                <Badge variant="negative" className="w-full justify-start">
                  Maximum planned trades reached.
                </Badge>
              )}
              {consecutiveLossLimitReached && (
                <Badge variant="negative" className="w-full justify-start">
                  Consecutive loss limit reached. Recommend reviewing the trading plan before continuing.
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {data.todaysTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Trades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.todaysTrades.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="font-medium">{t.symbol}</span>
                <span className="text-muted">{t.direction}</span>
                <span className={toNumber(t.netPnlUsd) >= 0 ? "text-positive" : "text-negative"}>
                  {formatUsd(toNumber(t.netPnlUsd), { showSign: true })}
                </span>
                <ResultBadge result={t.result as "WIN" | "LOSS" | "BREAKEVEN"} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
