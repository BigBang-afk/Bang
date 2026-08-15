import { SectionHeading } from "./section-heading";
import {
  BrainCircuit,
  CandlestickChart,
  ShieldAlert,
  Bell,
  Layers,
  Bot,
} from "lucide-react";

const features = [
  {
    icon: CandlestickChart,
    title: "Pro-grade TradingView charts",
    description:
      "Full advanced charting with 100+ indicators, drawing tools, and multi-timeframe analysis — embedded natively in your dashboard.",
    color: "text-brand-green",
    bg: "bg-brand-green/10",
  },
  {
    icon: BrainCircuit,
    title: "AI signal engine",
    description:
      "Pattern recognition and sentiment models score every symbol in your watchlist with a live confidence rating.",
    color: "text-brand-cyan",
    bg: "bg-brand-cyan/10",
  },
  {
    icon: Bot,
    title: "Automated strategy alerts",
    description:
      "Set rule-based triggers on price, volume, or AI score and get notified the instant conditions are met.",
    color: "text-brand-violet",
    bg: "bg-brand-violet/10",
  },
  {
    icon: Layers,
    title: "Unified portfolio view",
    description:
      "Track crypto, equities, forex, and indices side-by-side with real-time P&L and exposure breakdowns.",
    color: "text-brand-pink",
    bg: "bg-brand-pink/10",
  },
  {
    icon: ShieldAlert,
    title: "Institutional-grade risk tools",
    description:
      "Position sizing, drawdown alerts, and volatility-adjusted stop suggestions to keep every trade disciplined.",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    icon: Bell,
    title: "Real-time market news",
    description:
      "Curated headlines and economic calendar events streamed alongside the charts that matter to your positions.",
    color: "text-brand-green",
    bg: "bg-brand-green/10",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <SectionHeading
        eyebrow="Platform"
        title="Everything a serious trader needs, in one screen"
        description="Nexara replaces a dozen disconnected tools with a single, beautifully designed workspace."
      />

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="glass-card group rounded-2xl p-6 transition-transform hover:-translate-y-1"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.bg}`}
            >
              <f.icon className={`h-5 w-5 ${f.color}`} />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
