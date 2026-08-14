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
      phase="Coming soon"
      emptyTitle="Market scanner is next"
      emptyDescription="Live crypto data is connected as of this phase (see Charts/Markets) — the scanner will filter tracked assets by trend, momentum and volatility conditions once its screening logic ships."
    />
  );
}
