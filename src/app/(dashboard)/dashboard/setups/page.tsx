import type { Metadata } from "next";
import { LineChart } from "lucide-react";

import { ComingSoonPage } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "Setups" };

export default function SetupsPage() {
  return (
    <ComingSoonPage
      title="Setups"
      description="Structured entry, stop-loss and take-profit setups with a stated risk/reward ratio."
      icon={LineChart}
      phase="Phase 4"
      emptyTitle="Trading setups land in Phase 4"
      emptyDescription="The trading_setups table is already in place. Once AI analysis and alerts are live, setups generated from that analysis will appear here."
    />
  );
}
