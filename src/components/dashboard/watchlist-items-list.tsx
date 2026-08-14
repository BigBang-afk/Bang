"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CandlestickChart, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  removeWatchlistItemAction,
  reorderWatchlistItemAction,
} from "@/lib/actions/watchlist";
import { isMarketSupportedClient } from "@/lib/market-data/supported-markets";
import type { MarketAssetRow, WatchlistItemRow } from "@/types/database";

type Item = WatchlistItemRow & { market_assets: MarketAssetRow };

interface Ticker {
  price: number;
  changePercent24h: number | null;
}

export function WatchlistItemsList({
  watchlistId,
  items,
}: {
  watchlistId: string;
  items: Item[];
}) {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const symbolsKey = items.map((i) => i.market_assets.symbol).join(",");

  // Defined inline (not via useCallback) so each poll's setState calls are
  // unambiguously scoped to this effect's own async task.
  useEffect(() => {
    let ignore = false;

    async function run() {
      const supported = items.filter((i) =>
        isMarketSupportedClient(i.market_assets.market_type)
      );
      const results = await Promise.all(
        supported.map(async (item) => {
          try {
            const res = await fetch(
              `/api/market-data/ticker?symbol=${item.market_assets.symbol}`
            );
            if (!res.ok) return null;
            const body = (await res.json()) as { ticker: Ticker };
            return [item.market_assets.symbol, body.ticker] as const;
          } catch {
            return null;
          }
        })
      );
      if (!ignore) {
        setTickers(Object.fromEntries(results.filter((r) => r !== null)));
      }
    }

    run();
    const interval = setInterval(run, 30_000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No assets added yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => {
        const ticker = tickers[item.market_assets.symbol];
        const supported = isMarketSupportedClient(item.market_assets.market_type);
        return (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <span className="font-medium">{item.market_assets.symbol}</span>{" "}
              <span className="text-muted-foreground">{item.market_assets.display_name}</span>
              {supported && (
                <div className="text-xs text-muted-foreground">
                  {ticker ? (
                    <>
                      {ticker.price.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                      {ticker.changePercent24h !== null && (
                        <span
                          className={
                            ticker.changePercent24h >= 0
                              ? "ml-1.5 text-success"
                              : "ml-1.5 text-danger"
                          }
                        >
                          {ticker.changePercent24h >= 0 ? "+" : ""}
                          {ticker.changePercent24h.toFixed(2)}%
                        </span>
                      )}
                    </>
                  ) : (
                    "Loading…"
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Open chart"
                nativeButton={false}
                render={<Link href={`/dashboard/charts?symbol=${item.market_assets.symbol}`} />}
              >
                <CandlestickChart className="size-3.5" />
              </Button>

              <form action={reorderWatchlistItemAction}>
                <input type="hidden" name="watchlistId" value={watchlistId} />
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="direction" value="up" />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Move up"
                  disabled={index === 0}
                >
                  <ChevronUp className="size-3.5" />
                </Button>
              </form>

              <form action={reorderWatchlistItemAction}>
                <input type="hidden" name="watchlistId" value={watchlistId} />
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="direction" value="down" />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Move down"
                  disabled={index === items.length - 1}
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </form>

              <form action={removeWatchlistItemAction}>
                <input type="hidden" name="itemId" value={item.id} />
                <Button type="submit" variant="ghost" size="icon-xs" aria-label="Remove">
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
