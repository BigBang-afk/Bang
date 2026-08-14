import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { MarketAssetRow } from "@/types/database";

export const metadata: Metadata = { title: "Markets" };

const marketTypeLabel: Record<string, string> = {
  crypto: "Crypto",
  forex: "Forex",
  metals: "Metals",
  indices: "Indices",
  stocks: "Stocks",
};

export default async function MarketsPage() {
  const supabase = await createClient();
  const { data: assets } = await supabase
    .from("market_assets")
    .select("*")
    .eq("is_active", true)
    .order("market_type", { ascending: true })
    .order("symbol", { ascending: true });

  const grouped = ((assets ?? []) as MarketAssetRow[]).reduce<Record<string, MarketAssetRow[]>>(
    (acc, asset) => {
      acc[asset.market_type] = acc[asset.market_type] ?? [];
      acc[asset.market_type].push(asset);
      return acc;
    },
    {}
  );

  const hasAssets = Object.keys(grouped).length > 0;

  return (
    <div>
      <PageHeader
        title="Markets"
        description="Assets tracked by Lumenex. Live pricing and streaming quotes arrive in a later phase."
      />

      {!hasAssets ? (
        <EmptyState
          icon={Activity}
          title="No markets configured yet"
          description="An administrator needs to add market assets before they appear here."
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([type, list]) => (
            <div key={type}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                {marketTypeLabel[type] ?? type}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((asset) => (
                  <Card key={asset.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium">{asset.symbol}</p>
                        <p className="text-xs text-muted-foreground">{asset.display_name}</p>
                      </div>
                      <Badge variant="secondary">{asset.exchange ?? "—"}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
