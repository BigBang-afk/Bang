import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TradingChart } from "@/components/dashboard/trading-chart";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CandlestickChart } from "lucide-react";

export const metadata: Metadata = { title: "Charts" };

export default async function ChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  await requireUser("/dashboard/charts");
  const { symbol } = await searchParams;

  const supabase = await createClient();
  const { data: assets } = await supabase
    .from("market_assets")
    .select("*")
    .eq("is_active", true)
    .order("market_type")
    .order("symbol");

  if (!assets || assets.length === 0) {
    return (
      <div>
        <PageHeader title="Charts" description="Interactive price charts." />
        <EmptyState
          icon={CandlestickChart}
          title="No markets configured"
          description="An administrator needs to add market assets before charts are available."
        />
      </div>
    );
  }

  const cryptoAsset = assets.find((a) => a.market_type === "crypto");
  const initialSymbol = assets.find((a) => a.symbol === symbol)?.symbol ??
    cryptoAsset?.symbol ??
    assets[0].symbol;

  return (
    <div>
      <PageHeader
        title="Charts"
        description="Candlestick charts with live crypto pricing. Other markets show once a provider is connected."
      />
      <TradingChart assets={assets} initialSymbol={initialSymbol} />
    </div>
  );
}
