import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { ScannerPanel } from "@/components/dashboard/scanner-panel";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Scanner" };

export default async function ScannerPage() {
  await requireUser("/dashboard/scanner");

  return (
    <div>
      <PageHeader
        title="Scanner"
        description="Screen tracked assets by trend, momentum, volatility and volume conditions, computed from closed candles only."
      />
      <ScannerPanel />
    </div>
  );
}
