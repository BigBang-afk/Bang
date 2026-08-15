import { prisma } from "@/lib/prisma";
import { ArrowUpRight, ArrowDownRight, History } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

export async function SignalHistory() {
  const signals = await prisma.signal.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { requestedBy: { select: { name: true, avatarColor: true } } },
  });

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground-muted">
        <History className="h-4 w-4" />
        Recent confirmed signals
      </h3>

      {signals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-subtle p-6 text-center text-sm text-foreground-muted">
          No confirmed signals yet. Run an analysis above — confirmed setups will show up here.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border-subtle">
          {signals.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    s.direction === "LONG" ? "bg-brand-green/15 text-brand-green" : "bg-danger/15 text-danger",
                  )}
                >
                  {s.direction === "LONG" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {s.symbol} <span className="text-foreground-muted">· {s.timeframe.toUpperCase()}</span>
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Entry ${fmt(s.entry ?? s.price)} · {s.agreeingCount}/{s.totalStrategies} strategies ·{" "}
                    {s.confidence}% confidence
                  </p>
                </div>
              </div>
              <div className="text-right">
                {s.backtestWinRate !== null && (
                  <p className="text-xs font-semibold text-brand-green">{s.backtestWinRate}% backtest WR</p>
                )}
                <p className="text-xs text-foreground-muted">{s.createdAt.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
