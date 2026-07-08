"use client";

import { useState } from "react";
import { ExpiryKey, Pair } from "@/lib/types";
import { PairSelector } from "@/components/PairSelector";
import { ExpirySelector } from "@/components/ExpirySelector";
import { SignalCard } from "@/components/SignalCard";
import { ChartPanel } from "@/components/ChartPanel";
import { QuotexButton } from "@/components/QuotexButton";
import { useLiveSignal } from "@/hooks/useLiveSignal";

export default function DashboardPage() {
  const [pair, setPair] = useState<Pair>("EUR/USD OTC");
  const [expiry, setExpiry] = useState<ExpiryKey>("1m");
  const { signal, loading } = useLiveSignal(pair, expiry, true);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-bg-border bg-bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row">
          <PairSelector value={pair} onChange={setPair} />
          <ExpirySelector value={expiry} onChange={setExpiry} />
        </div>
        <QuotexButton />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ChartPanel pair={pair} expiry={expiry} />
        </div>
        <div className="lg:col-span-2">
          <SignalCard signal={signal} loading={loading} />
        </div>
      </div>

      <p className="text-center text-xs text-muted">
        All signals are probability-based technical analysis on a simulated OTC feed. No outcome
        is guaranteed — trade at your own risk.
      </p>
    </div>
  );
}
