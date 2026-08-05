"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineStyle,
  UTCTimestamp,
} from "lightweight-charts";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import type { Timeframe } from "@/types";

const TIMEFRAMES: Timeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"];

type DrawTool = "none" | "horizontal" | "trend" | "text";

interface ChartResponse {
  symbol: string;
  interval: string;
  candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[];
  overlays: Record<string, { time: number; value: number }[]>;
  indicators: Record<string, { time: number; value: number }[]>;
}

export function TradingChart({ symbol, onTimeframeChange }: { symbol: string; onTimeframeChange?: (tf: Timeframe) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeriesRef = useRef<Record<string, ISeriesApi<"Line">>>({});
  const trendPointsRef = useRef<{ time: UTCTimestamp; value: number }[]>([]);

  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [tool, setTool] = useState<DrawTool>("none");
  const [showEma, setShowEma] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVwap, setShowVwap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["candles", symbol, timeframe],
    queryFn: () => fetcher<ChartResponse>("/charts/candles", { symbol, interval: timeframe, limit: 500 }),
    refetchInterval: 15_000,
  });

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "#1a2130" }, horzLines: { color: "#1a2130" } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#242d40" },
      rightPriceScale: { borderColor: "#242d40" },
      autoSize: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "#3b82f6",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      overlaySeriesRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-to-draw handler
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries) return;

    const handler = (param: Parameters<Parameters<IChartApi["subscribeClick"]>[0]>[0]) => {
      if (tool === "none" || !param.point || !param.time) return;
      const price = candleSeries.coordinateToPrice(param.point.y);
      if (price === null) return;

      if (tool === "horizontal") {
        candleSeries.createPriceLine({
          price,
          color: "#f59e0b",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `H-Line ${price.toFixed(4)}`,
        });
      } else if (tool === "trend") {
        trendPointsRef.current.push({ time: param.time as UTCTimestamp, value: price });
        if (trendPointsRef.current.length === 2) {
          const line = chart.addLineSeries({ color: "#a855f7", lineWidth: 2 });
          line.setData([...trendPointsRef.current].sort((a, b) => (a.time as number) - (b.time as number)));
          trendPointsRef.current = [];
        }
      }
    };

    chart.subscribeClick(handler);
    return () => chart.unsubscribeClick(handler);
  }, [tool]);

  // Update data
  useEffect(() => {
    if (!data || !candleSeriesRef.current || !volumeSeriesRef.current || !chartRef.current) return;

    candleSeriesRef.current.setData(
      data.candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close }))
    );
    volumeSeriesRef.current.setData(
      data.candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)",
      }))
    );

    const desiredOverlays: Record<string, { color: string; enabled: boolean }> = {
      ema_9: { color: "#38bdf8", enabled: showEma },
      ema_20: { color: "#facc15", enabled: showEma },
      ema_50: { color: "#f97316", enabled: showEma },
      ema_200: { color: "#e11d48", enabled: showEma },
      vwap: { color: "#a855f7", enabled: showVwap },
      bb_upper: { color: "#475569", enabled: showBollinger },
      bb_mid: { color: "#64748b", enabled: showBollinger },
      bb_lower: { color: "#475569", enabled: showBollinger },
    };

    for (const [key, cfg] of Object.entries(desiredOverlays)) {
      const points = data.overlays[key];
      if (!points) continue;
      let series = overlaySeriesRef.current[key];
      if (!series) {
        series = chartRef.current.addLineSeries({ color: cfg.color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        overlaySeriesRef.current[key] = series;
      }
      if (cfg.enabled) {
        series.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        series.applyOptions({ visible: true });
      } else {
        series.applyOptions({ visible: false });
      }
    }
  }, [data, showEma, showBollinger, showVwap]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  return (
    <div className="card flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-base-700">
        <span className="font-semibold text-slate-100 px-2">{symbol}</span>
        <div className="flex gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf);
                onTimeframeChange?.(tf);
              }}
              className={`px-2 py-1 text-xs rounded ${
                timeframe === tf ? "bg-accent-brand text-white" : "text-slate-400 hover:bg-base-800"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-2">
          {(["none", "horizontal", "trend"] as DrawTool[]).map((t) => (
            <button
              key={t}
              onClick={() => setTool(tool === t ? "none" : t)}
              className={`px-2 py-1 text-xs rounded border ${
                tool === t ? "border-accent-brand text-accent-brand" : "border-base-700 text-slate-400"
              }`}
              title={t === "horizontal" ? "Horizontal line" : t === "trend" ? "Trend line (click twice)" : "Select"}
            >
              {t === "none" ? "Cursor" : t === "horizontal" ? "H-Line" : "Trend"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-2 text-xs">
          <label className="flex items-center gap-1 text-slate-400">
            <input type="checkbox" checked={showEma} onChange={() => setShowEma((v) => !v)} /> EMA
          </label>
          <label className="flex items-center gap-1 text-slate-400">
            <input type="checkbox" checked={showVwap} onChange={() => setShowVwap((v) => !v)} /> VWAP
          </label>
          <label className="flex items-center gap-1 text-slate-400">
            <input type="checkbox" checked={showBollinger} onChange={() => setShowBollinger((v) => !v)} /> BB
          </label>
        </div>
        <button onClick={toggleFullscreen} className="ml-auto px-2 py-1 text-xs rounded border border-base-700 text-slate-400">
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>
      <div className="relative flex-1 min-h-[400px]">
        {isLoading && <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Loading chart…</div>}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-accent-sell text-sm px-4 text-center">
            Failed to load chart data from MEXC. Check backend connectivity.
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
