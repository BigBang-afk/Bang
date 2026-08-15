"use client";

import { TVWidget } from "./tv-widget";

export function AdvancedChart({
  symbol = "BITSTAMP:BTCUSD",
  className = "h-[600px] w-full",
}: {
  symbol?: string;
  className?: string;
}) {
  return (
    <TVWidget
      className={className}
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
      config={{
        autosize: true,
        symbol,
        interval: "60",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        backgroundColor: "rgba(5, 7, 13, 1)",
        gridColor: "rgba(255, 255, 255, 0.06)",
        hide_top_toolbar: false,
        hide_legend: false,
        allow_symbol_change: true,
        withdateranges: true,
        studies: ["STD;EMA", "STD;Volume"],
        support_host: "https://www.tradingview.com",
      }}
    />
  );
}
