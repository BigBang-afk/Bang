"use client";

import { TVWidget } from "./tv-widget";

export function MiniSymbolOverview({
  symbol = "BITSTAMP:BTCUSD",
  className = "h-[220px] w-full",
}: {
  symbol?: string;
  className?: string;
}) {
  return (
    <TVWidget
      className={className}
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
      config={{
        symbol,
        width: "100%",
        height: "100%",
        locale: "en",
        dateRange: "3M",
        colorTheme: "dark",
        isTransparent: true,
        autosize: true,
        largeChartUrl: "",
        chartOnly: false,
        noTimeScale: false,
      }}
    />
  );
}

export function TechnicalAnalysis({
  symbol = "BITSTAMP:BTCUSD",
  className = "h-[450px] w-full",
}: {
  symbol?: string;
  className?: string;
}) {
  return (
    <TVWidget
      className={className}
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
      config={{
        interval: "1h",
        width: "100%",
        isTransparent: true,
        height: "100%",
        symbol,
        showIntervalTabs: true,
        displayMode: "single",
        locale: "en",
        colorTheme: "dark",
      }}
    />
  );
}
