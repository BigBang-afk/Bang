import { SectionHeading } from "./section-heading";
import { MarketOverview } from "@/components/tradingview/market-overview";
import { CryptoHeatmap } from "@/components/tradingview/heatmap";

export function MarketsSection() {
  return (
    <section id="markets" className="mx-auto max-w-7xl px-6 py-24">
      <SectionHeading
        eyebrow="Live data"
        title="Every market, live, before you even log in"
        description="Powered by TradingView's real-time data network — no delays, no guesswork."
      />

      <div className="mt-14 grid gap-5 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground-muted">
            Market Overview
          </h3>
          <MarketOverview className="h-[420px] w-full" />
        </div>
        <div className="glass-card rounded-2xl p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground-muted">
            Crypto Heatmap
          </h3>
          <CryptoHeatmap className="h-[420px] w-full" />
        </div>
      </div>
    </section>
  );
}
