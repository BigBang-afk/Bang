import type { Metadata } from "next";
import { Eye, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { AddWatchlistItemForm } from "@/components/dashboard/add-watchlist-item-form";
import { CreateWatchlistForm } from "@/components/dashboard/create-watchlist-form";
import { deleteWatchlistAction, removeWatchlistItemAction } from "@/lib/actions/watchlist";
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
      .order("created_at", { ascending: true }),
    supabase.from("market_assets").select("*").eq("is_active", true).order("symbol"),
    checkUsageLimit(profile.id, "watchlists"),
  ]);

  const lists = (watchlists ?? []) as unknown as WatchlistWithItems[];

  return (
    <div>
      <PageHeader
        title="Watchlist"
        description="Track the assets you're following. Live pricing arrives in a later phase."
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
                {list.watchlist_items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assets added yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {list.watchlist_items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">{item.market_assets.symbol}</span>{" "}
                          <span className="text-muted-foreground">
                            {item.market_assets.display_name}
                          </span>
                        </div>
                        <form action={removeWatchlistItemAction}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Remove"
                          >
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}

                <AddWatchlistItemForm watchlistId={list.id} assets={assets ?? []} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
