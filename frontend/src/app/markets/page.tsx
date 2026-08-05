"use client";

import { ScannerTable } from "@/components/scanner/ScannerTable";
import { TradingChart } from "@/components/charts/TradingChart";
import { useScanner } from "@/hooks/useScanner";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function MarketsPage() {
  const { tickers } = useScanner();
  const selectedSymbol = useSettingsStore((s) => s.selectedSymbol);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-[calc(100vh-120px)]">
      <div className="xl:col-span-2">
        <TradingChart symbol={selectedSymbol} />
      </div>
      <div>
        <ScannerTable tickers={tickers} />
      </div>
    </div>
  );
}
