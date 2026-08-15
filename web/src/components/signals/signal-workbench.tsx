"use client";

import { useState, useTransition } from "react";
import { SIGNAL_PAIRS } from "@/lib/signals/candles";
import { SUPPORTED_TIMEFRAMES, type AiSignal } from "@/lib/signals/engine";
import { runAiAnalysis } from "@/app/dashboard/signals/actions";
import { Button } from "@/components/ui/button";
import { SignalResult } from "./signal-result";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";

export function SignalWorkbench() {
  const [symbol, setSymbol] = useState(SIGNAL_PAIRS[0].symbol);
  const [timeframe, setTimeframe] = useState<string>("1h");
  const [result, setResult] = useState<AiSignal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pair = SIGNAL_PAIRS.find((p) => p.symbol === symbol)!;

  const onAnalyze = () => {
    setError(null);
    startTransition(async () => {
      try {
        const signal = await runAiAnalysis(symbol, timeframe);
        setResult(signal);
      } catch {
        setError("Couldn't run analysis for this pair right now. Try again in a moment.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs font-medium text-foreground-muted">Pair</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SIGNAL_PAIRS.map((p) => (
                  <button
                    key={p.symbol}
                    onClick={() => setSymbol(p.symbol)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                      symbol === p.symbol
                        ? "bg-brand-green/15 text-brand-green"
                        : "bg-surface text-foreground-muted hover:text-foreground",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground-muted">Timeframe</label>
              <div className="mt-1.5 flex gap-1.5">
                {SUPPORTED_TIMEFRAMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTimeframe(t.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                      timeframe === t.value
                        ? "bg-brand-cyan/15 text-brand-cyan"
                        : "bg-surface text-foreground-muted hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={onAnalyze} disabled={isPending} size="lg">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Run AI analysis
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && <SignalResult signal={result} label={`${pair.label} · 7-strategy confluence read`} />}
    </div>
  );
}
