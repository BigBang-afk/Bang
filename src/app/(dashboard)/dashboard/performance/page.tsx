import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { ComingSoonPage } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "Performance" };

export default function PerformancePage() {
  return (
    <ComingSoonPage
      title="Performance"
      description="Win rate, average R, drawdown and other stats computed from your trade journal."
      icon={BarChart3}
      phase="Phase 5"
      emptyTitle="Performance analytics land in Phase 5"
      emptyDescription="Log trades in your journal now — performance analytics will be computed from that history once this phase ships."
    />
  );
}
