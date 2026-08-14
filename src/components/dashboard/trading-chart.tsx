"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { Expand, Minimize, RefreshCw, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SymbolSearch } from "@/components/dashboard/symbol-search";
import { isMarketSupportedClient } from "@/lib/market-data/supported-markets";
import { cn } from "@/lib/utils";
import type { MarketAssetRow } from "@/types/database";

interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

interface Ticker {
  price: number;
  changePercent24h: number | null;
  high24h: number | null;
  low24h: number | null;
  volume24h: number | null;
  timestamp: string;
}

interface DataSource {
  providerName: string;
  latency: "realtime" | "delayed";
}

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function TradingChart({
  assets,
  initialSymbol,
}: {
  assets: MarketAssetRow[];
  initialSymbol: string;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "unsupported">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const asset = assets.find((a) => a.symbol === symbol);

  // Create the chart once and tear it down on unmount.
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: cssVar("--muted-foreground") || "#888",
        fontFamily: "var(--font-geist-sans, sans-serif)",
      },
      grid: {
        vertLines: { color: cssVar("--border") || "#222" },
        horzLines: { color: cssVar("--border") || "#222" },
      },
      rightPriceScale: { borderColor: cssVar("--border") || "#222" },
      timeScale: {
        borderColor: cssVar("--border") || "#222",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 0 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: cssVar("--success") || "#22c55e",
      downColor: cssVar("--danger") || "#ef4444",
      borderVisible: false,
      wickUpColor: cssVar("--success") || "#22c55e",
      wickDownColor: cssVar("--danger") || "#ef4444",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: cssVar("--muted-foreground") || "#666",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Fetches OHLCV + ticker for the current symbol/timeframe, on mount, on
  // every symbol/timeframe/manual-refresh change, and every 15s after
  // that. Defined inline (not via useCallback) so each poll's setState
  // calls are unambiguously scoped to this effect's own async task.
  useEffect(() => {
    let ignore = false;

    async function run() {
      if (!asset) {
        if (!ignore) {
          setStatus("error");
          setErrorMessage("Unknown symbol.");
        }
        return;
      }
      if (!isMarketSupportedClient(asset.market_type)) {
        if (!ignore) {
          setStatus("unsupported");
          candleSeriesRef.current?.setData([]);
          volumeSeriesRef.current?.setData([]);
        }
        return;
      }

      try {
        const [ohlcvRes, tickerRes] = await Promise.all([
          fetch(`/api/market-data/ohlcv?symbol=${symbol}&timeframe=${timeframe}&limit=300`),
          fetch(`/api/market-data/ticker?symbol=${symbol}`),
        ]);
        if (ignore) return;

        if (!ohlcvRes.ok) {
          const body = await ohlcvRes.json().catch(() => ({}));
          throw new Error(body.error ?? "Couldn't load chart data.");
        }

        const ohlcvBody = (await ohlcvRes.json()) as {
          candles: OHLCVCandle[];
          source: DataSource;
        };
        if (ignore) return;

        const candles = ohlcvBody.candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        const volumes = ohlcvBody.candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume ?? 0,
          color: c.close >= c.open ? cssVar("--success") + "80" : cssVar("--danger") + "80",
        }));

        candleSeriesRef.current?.setData(candles);
        volumeSeriesRef.current?.setData(volumes);
        chartRef.current?.timeScale().fitContent();
        setSource(ohlcvBody.source);

        if (tickerRes.ok) {
          const tickerBody = (await tickerRes.json()) as { ticker: Ticker; source: DataSource };
          if (ignore) return;
          setTicker(tickerBody.ticker);
          setSource(tickerBody.source);
        }

        setStatus("ready");
        setErrorMessage(null);
      } catch (err) {
        if (!ignore) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Couldn't load chart data.");
        }
      }
    }

    run();
    const interval = setInterval(run, 15_000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [asset, symbol, timeframe, refreshNonce]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
      requestAnimationFrame(() => chartRef.current?.resize(0, 0, true));
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await wrapperRef.current.requestFullscreen();
    }
  }

  function refresh() {
    setRefreshNonce((n) => n + 1);
  }

  return (
    <div ref={wrapperRef} className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
        <div className="flex items-center gap-3">
          <SymbolSearch assets={assets} value={symbol} onSelect={setSymbol} />
          {asset && (
            <div>
              <p className="text-sm font-medium">{asset.symbol}</p>
              {ticker && (
                <p className="text-xs text-muted-foreground">
                  {ticker.price.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                  {ticker.changePercent24h !== null && (
                    <span
                      className={cn(
                        "ml-1.5",
                        ticker.changePercent24h >= 0 ? "text-success" : "text-danger"
                      )}
                    >
                      {ticker.changePercent24h >= 0 ? "+" : ""}
                      {ticker.changePercent24h.toFixed(2)}%
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
            <TabsList>
              {TIMEFRAMES.map((tf) => (
                <TabsTrigger key={tf} value={tf}>
                  {tf}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="icon-sm" onClick={refresh} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
          </Button>
        </div>
      </div>

      <div className="relative h-[420px] w-full sm:h-[520px]">
        <div ref={containerRef} className="absolute inset-0" />

        {status === "unsupported" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/95 p-6 text-center">
            <TriangleAlert className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No data source connected</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {asset?.display_name ?? "This market"} ({asset?.market_type}) isn&apos;t
              covered by a connected provider yet — only crypto has a live feed right
              now.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/95 p-6 text-center">
            <TriangleAlert className="size-6 text-danger" />
            <p className="text-sm font-medium">Couldn&apos;t load chart data</p>
            <p className="max-w-sm text-xs text-muted-foreground">{errorMessage}</p>
            <Button size="sm" variant="outline" onClick={refresh}>
              Retry
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant={status === "ready" ? "default" : "secondary"} className="gap-1">
            <span
              className={cn(
                "size-1.5 rounded-full",
                status === "ready" ? "bg-current" : "bg-muted-foreground"
              )}
            />
            {status === "ready"
              ? source?.latency === "realtime"
                ? "Live"
                : "Delayed"
              : status === "loading"
                ? "Loading"
                : status === "unsupported"
                  ? "Not connected"
                  : "Error"}
          </Badge>
          {source && <span>Source: {source.providerName}</span>}
        </div>
        {ticker && <span>Updated {new Date(ticker.timestamp).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}
