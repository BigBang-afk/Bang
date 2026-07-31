"use client";

import { createChart, type CandlestickData, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef } from "react";

import { API_URL, WS_URL } from "@/lib/config";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Candle, Signal } from "@/types";

interface LiveChartProps {
  symbol: string;
  timeframe: string;
  activeSignal?: Signal | null;
}

interface CandleMessage {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  is_complete: boolean;
}

function toUtcTimestamp(iso: string): UTCTimestamp {
  return Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp;
}

export function LiveChart({ symbol, timeframe, activeSignal }: LiveChartProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "transparent" }, textColor: "#9ca3af" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      width: containerRef.current.clientWidth,
      height: 420,
      timeScale: { timeVisible: true, secondsVisible: true },
      crosshair: { mode: 0 },
    });
    const series = chart.addCandlestickSeries({
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory(): Promise<void> {
      const response = await fetch(
        `${API_URL}/api/v1/assets/${encodeURIComponent(symbol)}/candles?timeframe=${timeframe}&limit=300`
      );
      if (!response.ok || cancelled) return;
      const candles: Candle[] = await response.json();
      if (!seriesRef.current) return;
      const data: CandlestickData[] = candles.map((c) => ({
        time: toUtcTimestamp(c.timestamp),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      seriesRef.current.setData(data);
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  const wsUrl = `${WS_URL}/ws/market/${encodeURIComponent(symbol)}?timeframe=${timeframe}`;
  useWebSocket(wsUrl, {
    onMessage: (data) => {
      const msg = data as CandleMessage;
      if (!msg?.timestamp || !seriesRef.current) return;
      seriesRef.current.update({
        time: toUtcTimestamp(msg.timestamp),
        open: parseFloat(msg.open),
        high: parseFloat(msg.high),
        low: parseFloat(msg.low),
        close: parseFloat(msg.close),
      });
    },
  });

  useEffect(() => {
    if (!seriesRef.current || !activeSignal?.entry_price) return;
    seriesRef.current.setMarkers([
      {
        time: toUtcTimestamp(activeSignal.entry_time),
        position: activeSignal.direction === "CALL" ? "belowBar" : "aboveBar",
        color: activeSignal.direction === "CALL" ? "#16a34a" : "#dc2626",
        shape: activeSignal.direction === "CALL" ? "arrowUp" : "arrowDown",
        text: `${activeSignal.direction} @ ${activeSignal.entry_price}`,
      },
    ]);
  }, [activeSignal]);

  return <div ref={containerRef} className="w-full" data-testid="live-chart" />;
}
