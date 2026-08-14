import type { Metadata } from "next";
import { CandlestickChart } from "lucide-react";

import { ComingSoonPage } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "Charts" };

export default function ChartsPage() {
  return (
    <ComingSoonPage
      title="Charts"
      description="Interactive price charts for every supported market."
      icon={CandlestickChart}
      phase="Phase 2"
      emptyTitle="TradingView charts land in Phase 2"
      emptyDescription="Interactive candlestick charts, powered by TradingView Lightweight Charts and live market data, ship once the market-data integration is built."
    />
  );
}
