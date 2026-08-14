import type { Metadata } from "next";
import { Eye, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { AddWatchlistItemForm } from "@/components/dashboard/add-watchlist-item-form";
import { CreateWatchlistForm } from "@/components/dashboard/create-watchlist-form";
import { WatchlistItemsList } from "@/components/dashboard/watchlist-items-list";
import { deleteWatchlistAction } from "@/lib/actions/watchlist";
import { checkUsageLimit } from "@/lib/entitlements";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MarketAssetRow, WatchlistItemRow, WatchlistRow } from "@/types/database";

export const metadata: Metadata = { title: "Watchlist" };

type WatchlistWithItems = WatchlistRow & {
  watchlist_items: (WatchlistItemRow & { market_assets: MarketAssetRow })[];
};

export default async function WatchlistPage() {
  const profile = await requireUser("/dashboard/watchlist");
  const supabase = await createClient();

  const [{ data: watchlists }, { data: assets }, watchlistUsage] = await Promise.all([
    supabase
      .from("watchlists")
      .select("*, watchlist_items(*, market_assets(*))")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true })
      .order("sort_order", { referencedTable: "watchlist_items", ascending: true }),
    supabase.from("market_assets").select("*").eq("is_active", true).order("symbol"),
    checkUsageLimit(profile.id, "watchlists"),
  ]);

  const lists = (watchlists ?? []) as unknown as WatchlistWithItems[];

  return (
    <div>
      <PageHeader
        title="Watchlist"
        description="Track the assets you're following, with live pricing for crypto."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Create a watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateWatchlistForm used={watchlistUsage.used} limit={watchlistUsage.limit} />
        </CardContent>
      </Card>

      {lists.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="No watchlists yet"
          description="Create your first watchlist above to start tracking assets."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lists.map((list) => (
            <Card key={list.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{list.name}</CardTitle>
                <form action={deleteWatchlistAction}>
                  <input type="hidden" name="watchlistId" value={list.id} />
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete watchlist">
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </form>
              </CardHeader>
              <CardContent className="space-y-3">
                <WatchlistItemsList watchlistId={list.id} items={list.watchlist_items} />

                <AddWatchlistItemForm watchlistId={list.id} assets={assets ?? []} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
