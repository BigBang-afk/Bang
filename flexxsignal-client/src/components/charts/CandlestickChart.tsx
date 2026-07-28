import { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries, type IChartApi } from "lightweight-charts";
import type { CandleSnapshotPointDto } from "../../types/domain";

export function CandlestickChart({ candles, height = 320 }: { candles: CandleSnapshotPointDto[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "rgba(255,255,255,0.05)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
      timeScale: { timeVisible: true, secondsVisible: true, borderColor: "rgba(255,255,255,0.1)" },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444", borderVisible: false, wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });

    series.setData(
      candles.map((c) => ({
        time: Math.floor(new Date(c.timeUtc).getTime() / 1000) as any,
        open: c.open, high: c.high, low: c.low, close: c.close,
      }))
    );
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) chart.applyOptions({ width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [candles, height]);

  if (candles.length === 0) {
    return <div className="glass-card flex items-center justify-center text-slate-500 text-sm" style={{ height }}>No candle data available for this snapshot.</div>;
  }

  return <div ref={containerRef} className="w-full" />;
}
