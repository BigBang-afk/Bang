"use client";

import { ScannerTable } from "@/components/scanner/ScannerTable";
import { VolatilityPanel } from "@/components/scanner/VolatilityPanel";
import { useScanner } from "@/hooks/useScanner";

export default function ScannerPage() {
  const { tickers, opportunities } = useScanner();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-120px)]">
      <ScannerTable tickers={tickers} />
      <VolatilityPanel opportunities={opportunities} />
    </div>
  );
}
