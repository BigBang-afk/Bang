"use client";

import { useEffect, useRef } from "react";

interface Props {
  symbol: string; // e.g. "MEXC:BTCUSDT"
  interval?: string; // "1", "5", "15", "60", "240", "D"
  height?: number;
  studies?: string[];
}

/**
 * Embeds TradingView's free Advanced Chart widget (widget.js), which supports symbol,
 * interval, EMA/VWAP studies, and drawing tools out of the box. Full order-block / FVG /
 * liquidity-zone overlays (server-driven) are drawn by a follow-up phase using the
 * Charting Library's drawing API once a commercial charting-library license is available;
 * for now those levels are also rendered as horizontal price lines by the signal cards.
 */
export function TradingViewWidget({ symbol, interval = "60", height = 520, studies = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(10, 10, 11, 1)",
      gridColor: "rgba(42, 42, 49, 0.4)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      studies: studies.length ? studies : ["MAExp@tv-basicstudies", "VWAP@tv-basicstudies"],
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);
  }, [symbol, interval, studies]);

  return (
    <div className="card overflow-hidden p-0">
      <div className="tradingview-widget-container" ref={containerRef} style={{ height }} />
    </div>
  );
}
