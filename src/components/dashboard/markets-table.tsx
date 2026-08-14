"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CandlestickChart, Eye, Plus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { quickAddToWatchlistAction } from "@/lib/actions/watchlist";
import { isMarketSupportedClient } from "@/lib/market-data/supported-markets";
import { cn } from "@/lib/utils";
import type { MarketAssetRow } from "@/types/database";

interface Ticker {
  price: number;
  changePercent24h: number | null;
  volume24h: number | null;
  timestamp: string;
}

interface MarketStatusInfo {
  state: "open" | "closed" | "unknown";
}

const marketTypeLabel: Record<string, string> = {
  crypto: "Crypto",
  forex: "Forex",
  metals: "Metals",
  indices: "Indices",
  stocks: "Stocks",
};

export function MarketsTable({
  assets,
  watchlists,
}: {
  assets: MarketAssetRow[];
  watchlists: { id: string; name: string }[];
}) {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [statuses, setStatuses] = useState<Record<string, MarketStatusInfo>>({});
  const [loading, setLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const supportedAssets = assets.filter((a) => isMarketSupportedClient(a.market_type));
  const marketTypes = [...new Set(assets.map((a) => a.market_type))];

  // Defined inline (not via useCallback) so each poll's setState calls are
  // unambiguously scoped to this effect's own async task.
  useEffect(() => {
    let ignore = false;

    async function run() {
      if (!ignore) setLoading(true);

      const [tickerResults, statusResults] = await Promise.all([
        Promise.all(
          supportedAssets.map(async (asset) => {
            try {
              const res = await fetch(`/api/market-data/ticker?symbol=${asset.symbol}`);
              if (!res.ok) return null;
              const body = (await res.json()) as { ticker: Ticker };
              return [asset.symbol, body.ticker] as const;
            } catch {
              return null;
            }
          })
        ),
        Promise.all(
          marketTypes.map(async (type) => {
            try {
              const res = await fetch(`/api/market-data/status?market=${type}`);
              if (!res.ok) return null;
              const body = (await res.json()) as { status: MarketStatusInfo };
              return [type, body.status] as const;
            } catch {
              return null;
            }
          })
        ),
      ]);

      if (ignore) return;
      setTickers(Object.fromEntries(tickerResults.filter((r) => r !== null)));
      setStatuses(Object.fromEntries(statusResults.filter((r) => r !== null)));
      setLoading(false);
    }

    run();
    const interval = setInterval(run, 30_000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, refreshNonce]);

  function refresh() {
    setRefreshNonce((n) => n + 1);
  }

  const grouped = marketTypes.reduce<Record<string, MarketAssetRow[]>>((acc, type) => {
    acc[type] = assets.filter((a) => a.market_type === type);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {Object.entries(grouped).map(([type, list]) => {
        const supported = isMarketSupportedClient(type as MarketAssetRow["market_type"]);
        const status = statuses[type];
        return (
          <div key={type}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {marketTypeLabel[type] ?? type}
              </h2>
              {supported ? (
                <Badge variant={status?.state === "open" ? "default" : "secondary"}>
                  {status?.state ?? "…"}
                </Badge>
              ) : (
                <Badge variant="outline">No data source connected</Badge>
              )}
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>24h change</TableHead>
                      <TableHead>24h volume</TableHead>
                      <TableHead>Last update</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((asset) => {
                      const ticker = tickers[asset.symbol];
                      return (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">
                            {asset.symbol}
                            <span className="ml-2 font-normal text-muted-foreground">
                              {asset.display_name}
                            </span>
                          </TableCell>
                          <TableCell>
                            {!supported ? (
                              <span className="text-muted-foreground">—</span>
                            ) : ticker ? (
                              ticker.price.toLocaleString(undefined, {
                                maximumFractionDigits: 5,
                              })
                            ) : (
                              <span className="text-muted-foreground">Loading…</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {ticker?.changePercent24h != null ? (
                              <span
                                className={
                                  ticker.changePercent24h >= 0 ? "text-success" : "text-danger"
                                }
                              >
                                {ticker.changePercent24h >= 0 ? "+" : ""}
                                {ticker.changePercent24h.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ticker?.volume24h != null
                              ? ticker.volume24h.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ticker ? new Date(ticker.timestamp).toLocaleTimeString() : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Open chart"
                                nativeButton={false}
                                render={
                                  <Link href={`/dashboard/charts?symbol=${asset.symbol}`} />
                                }
                              >
                                <CandlestickChart className="size-3.5" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      aria-label="Add to watchlist"
                                    >
                                      <Eye className="size-3.5" />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Add to watchlist</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {watchlists.length === 0 ? (
                                    <DropdownMenuItem
                                      render={<Link href="/dashboard/watchlist" />}
                                    >
                                      Create a watchlist first
                                    </DropdownMenuItem>
                                  ) : (
                                    watchlists.map((w) => (
                                      <form key={w.id} action={quickAddToWatchlistAction}>
                                        <input type="hidden" name="watchlistId" value={w.id} />
                                        <input type="hidden" name="assetId" value={asset.id} />
                                        <DropdownMenuItem
                                          render={<button type="submit" className="w-full" />}
                                        >
                                          <Plus className="size-3.5" />
                                          {w.name}
                                        </DropdownMenuItem>
                                      </form>
                                    ))
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
