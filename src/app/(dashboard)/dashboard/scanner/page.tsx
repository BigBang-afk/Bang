import type { Metadata } from "next";
import { ScanSearch } from "lucide-react";

import { ComingSoonPage } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "Scanner" };

export default function ScannerPage() {
  return (
    <ComingSoonPage
      title="Scanner"
      description="Screen assets by technical conditions instead of checking each one by hand."
      icon={ScanSearch}
      phase="Phase 3"
      emptyTitle="Market scanner lands in Phase 3"
      emptyDescription="Once live market data is connected, the scanner will let you filter tracked assets by trend, momentum and volatility conditions."
    />
  );
}
