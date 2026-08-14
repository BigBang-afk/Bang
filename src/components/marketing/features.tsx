import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CandlestickChart,
  Eye,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: CandlestickChart,
    title: "Interactive charts",
    description: "TradingView-grade charting for every supported market, in one place.",
  },
  {
    icon: ScanSearch,
    title: "Market scanner",
    description: "Filter assets by technical conditions instead of checking each one by hand.",
  },
  {
    icon: Sparkles,
    title: "AI market analysis",
    description: "Structured, model-generated context on trend, momentum and key levels.",
  },
  {
    icon: Calculator,
    title: "Risk calculator",
    description: "Position sizing based on your account risk, entry and stop-loss.",
  },
  {
    icon: Eye,
    title: "Watchlists",
    description: "Track the assets that matter to you across every supported market.",
  },
  {
    icon: BookOpen,
    title: "Trade journal",
    description: "Log trades, tag them, and review outcomes against your original plan.",
  },
  {
    icon: AlertTriangle,
    title: "Alerts",
    description: "Get notified when price or an indicator condition is met.",
  },
  {
    icon: ShieldCheck,
    title: "Performance analytics",
    description: "Win rate, average R, and drawdown — measured, not guessed.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a systematic trader needs
          </h2>
          <p className="mt-4 text-muted-foreground">
            Built as one connected platform, not a pile of disconnected widgets.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <feature.icon className="size-4.5" />
              </div>
              <h3 className="mt-4 text-sm font-medium">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
