import { AiSignal } from "@/lib/signals/engine";
import { StrategyChecklist } from "./strategy-checklist";
import { CONFIRMATION_RULES } from "@/lib/signals/strategies";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, ShieldAlert, TrendingUp, Target } from "lucide-react";

function fmt(n: number) {
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

export function SignalResult({ signal, label }: { signal: AiSignal; label: string }) {
  const { confluence } = signal;
  const isLong = signal.direction === "LONG";

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-foreground-muted">{label}</p>
          <p className="font-display text-xl font-bold">
            {signal.timeframe.toUpperCase()} · ${fmt(signal.price)}
          </p>
        </div>

        {confluence.confirmed ? (
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold",
              isLong ? "bg-brand-green/15 text-brand-green" : "bg-danger/15 text-danger",
            )}
          >
            {isLong ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {signal.direction} confirmed
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-foreground-muted">
            <ShieldAlert className="h-4 w-4" />
            No trade — not enough confirmation
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border-subtle p-4">
          <p className="text-xs text-foreground-muted">AI confidence</p>
          <p className="mt-1 font-display text-2xl font-bold">{confluence.confidence}%</p>
        </div>
        <div className="rounded-xl border border-border-subtle p-4">
          <p className="text-xs text-foreground-muted">Strategy agreement</p>
          <p className="mt-1 font-display text-2xl font-bold">
            {confluence.agreeingCount}/{confluence.totalStrategies}
          </p>
        </div>
        <div className="rounded-xl border border-border-subtle p-4">
          <p className="text-xs text-foreground-muted">Confirmation bar</p>
          <p className="mt-1 font-display text-2xl font-bold">
            {CONFIRMATION_RULES.minAgreeing}/7 @ {CONFIRMATION_RULES.minConfidence}%
          </p>
        </div>
      </div>

      {signal.levels && confluence.confirmed && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            <LevelCard label="Entry" value={fmt(signal.levels.entry)} accent="neutral" />
            <LevelCard label="Stop loss" value={fmt(signal.levels.stopLoss)} accent="danger" />
            <LevelCard label="TP1 (1R)" value={fmt(signal.levels.takeProfits[0])} accent="green" />
            <LevelCard label="TP2 (2R)" value={fmt(signal.levels.takeProfits[1])} accent="green" />
            <LevelCard label="TP3 (3.5R)" value={fmt(signal.levels.takeProfits[2])} accent="green" />
          </div>

          <div className="mt-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground-muted">
              <TrendingUp className="h-4 w-4" />
              Trailing stop plan
            </h4>
            <div className="flex flex-col gap-2">
              {signal.trailing.map((rule, i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-border-subtle p-3 text-sm">
                  <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-brand-cyan">
                    {rule.after}
                  </span>
                  <span className="text-foreground-muted">{rule.action}</span>
                </div>
              ))}
            </div>
          </div>

          {signal.backtest.winRate !== null && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-brand-green/30 bg-brand-green/5 p-4">
              <Target className="h-5 w-5 shrink-0 text-brand-green" />
              <p className="text-sm">
                <span className="font-bold text-brand-green">{signal.backtest.winRate}% historical win rate</span>{" "}
                <span className="text-foreground-muted">
                  — this exact strategy combination hit TP1 before stop-loss in {signal.backtest.wins} of{" "}
                  {signal.backtest.wins + signal.backtest.losses} confirmed setups over the last ~
                  {signal.backtest.totalSignals + 240} candles. Past performance doesn&apos;t guarantee future
                  results.
                </span>
              </p>
            </div>
          )}
        </>
      )}

      {(signal.nearestSupport || signal.nearestResistance) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {signal.nearestSupport && (
            <div className="rounded-xl border border-border-subtle p-3 text-sm">
              <span className="text-foreground-muted">Recent swing low: </span>
              <span className="font-medium">${fmt(signal.nearestSupport.price)}</span>{" "}
              <span className="text-foreground-muted">
                ({signal.nearestSupport.distancePct >= 0 ? "-" : "+"}
                {Math.abs(signal.nearestSupport.distancePct).toFixed(2)}% from price)
              </span>
            </div>
          )}
          {signal.nearestResistance && (
            <div className="rounded-xl border border-border-subtle p-3 text-sm">
              <span className="text-foreground-muted">Recent swing high: </span>
              <span className="font-medium">${fmt(signal.nearestResistance.price)}</span>{" "}
              <span className="text-foreground-muted">
                (+{signal.nearestResistance.distancePct.toFixed(2)}% from price)
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h4 className="mb-1 text-sm font-semibold text-foreground-muted">Strategy breakdown</h4>
        <StrategyChecklist votes={confluence.votes} />
      </div>
    </div>
  );
}

function LevelCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "neutral" | "danger" | "green";
}) {
  return (
    <div className="rounded-xl border border-border-subtle p-3 text-center">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-sm font-bold sm:text-base",
          accent === "danger" && "text-danger",
          accent === "green" && "text-brand-green",
        )}
      >
        ${value}
      </p>
    </div>
  );
}
