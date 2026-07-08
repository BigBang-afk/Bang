"use client";

import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { ExpiryKey, Pair } from "@/lib/types";
import { generateCandles } from "@/lib/candles/generator";
import { EXPIRY_TIMEFRAME_SECONDS } from "@/lib/engine/signalEngine";

export function ChartPanel({ pair, expiry }: { pair: Pair; expiry: ExpiryKey }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#8b96a5",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      width: containerRef.current.clientWidth,
      height: 320,
      timeScale: { timeVisible: true, secondsVisible: true },
      rightPriceScale: { borderColor: "#1f2937" },
      crosshair: { mode: 0 },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#16c784",
      downColor: "#ea3943",
      borderVisible: false,
      wickUpColor: "#16c784",
      wickDownColor: "#ea3943",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timeframe = EXPIRY_TIMEFRAME_SECONDS[expiry];

    const render = () => {
      const now = Math.floor(Date.now() / 1000);
      const candles = generateCandles(pair, timeframe, 80, now);
      seriesRef.current?.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    };

    render();
    const id = setInterval(render, 1000);
    return () => clearInterval(id);
  }, [pair, expiry]);

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{pair} — Live Chart</h3>
        <span className="text-xs text-muted">Simulated OTC feed</span>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
