import { ButtonLink } from "@/components/ui/button";
import { MiniSymbolOverview } from "@/components/tradingview/symbol-overview";
import { ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-fade absolute inset-0 -z-10 h-[700px]" />

      <div className="mx-auto grid max-w-7xl gap-12 px-6 pt-20 pb-24 lg:grid-cols-2 lg:items-center lg:pt-28">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-foreground-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand-green" />
            AI market intelligence, live for 2026
          </span>

          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Trade the markets with{" "}
            <span className="gradient-text">an unfair advantage.</span>
          </h1>

          <p className="max-w-lg text-lg text-foreground-muted">
            Nexara fuses real-time TradingView charting, AI-driven signals, and
            institutional-grade risk tools into one beautifully simple platform —
            built for traders who refuse to miss a move.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/register" size="lg">
              Start trading free
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/#features" variant="secondary" size="lg">
              Explore features
            </ButtonLink>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-foreground-muted">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-green" />
              Bank-grade encryption
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand-cyan" />
              Sub-second data feeds
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-green/10 via-brand-cyan/10 to-brand-violet/10 blur-2xl" />

          <div className="glass-card animate-float rounded-2xl p-4 shadow-2xl shadow-black/40">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-muted">BTC / USD</p>
                <p className="font-display text-2xl font-bold">Bitcoin</p>
              </div>
              <span className="rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-semibold text-brand-green">
                Live
              </span>
            </div>
            <MiniSymbolOverview symbol="BITSTAMP:BTCUSD" className="h-[260px] w-full" />
          </div>

          <div className="glass-card absolute -bottom-8 -left-8 hidden w-48 rounded-2xl p-4 sm:block">
            <p className="text-xs text-foreground-muted">AI Confidence Score</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-display text-3xl font-bold text-brand-green">87%</span>
              <span className="mb-1 text-xs text-brand-green">Bullish</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-brand-green to-brand-cyan" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
