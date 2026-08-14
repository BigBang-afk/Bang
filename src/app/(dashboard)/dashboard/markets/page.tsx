import type { Metadata } from "next";
import { Activity } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { MarketsTable } from "@/components/dashboard/markets-table";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MarketAssetRow } from "@/types/database";

export const metadata: Metadata = { title: "Markets" };

export default async function MarketsPage() {
  const profile = await requireUser("/dashboard/markets");
  const supabase = await createClient();

  const [{ data: assets }, { data: watchlists }] = await Promise.all([
    supabase
      .from("market_assets")
      .select("*")
      .eq("is_active", true)
      .order("market_type", { ascending: true })
      .order("symbol", { ascending: true }),
    supabase
      .from("watchlists")
      .select("id, name")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true }),
  ]);

  const list = (assets ?? []) as MarketAssetRow[];

  return (
    <div>
      <PageHeader
        title="Markets"
        description="Live pricing for crypto via Binance.US. Forex, gold and indices are tracked but not yet connected to a data source."
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No markets configured yet"
          description="An administrator needs to add market assets before they appear here."
        />
      ) : (
        <MarketsTable assets={list} watchlists={watchlists ?? []} />
      )}
    </div>
  );
}
