"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SignalCard } from "@/components/signals/SignalCard";
import { useSessionStore } from "@/lib/sessionStore";
import { api } from "@/lib/api";
import type { Signal } from "@/lib/types";

export default function SignalsPage() {
  const { tradingMode } = useSessionStore();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [scanning, setScanning] = useState(false);

  const loadSignals = () => {
    api.get<Signal[]>("/signals?limit=50").then(setSignals).catch(() => {});
  };

  useEffect(loadSignals, []);

  const runScan = async () => {
    setScanning(true);
    try {
      await api.post("/signals/scan", { trading_mode: tradingMode ?? "intraday" });
      loadSignals();
    } finally {
      setScanning(false);
    }
  };

  return (
    <AppShell title="AI Signals">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">
          High-confidence setups only (≥70% score). Every signal carries a confidence breakdown and reasons —
          never a guarantee.
        </p>
        <button onClick={runScan} disabled={scanning} className="btn-primary">
          {scanning ? "Scanning market..." : "Scan Now"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {signals.length === 0 && <p className="text-gray-400 text-sm">No signals yet — run a scan to get started.</p>}
        {signals.map((s) => (
          <SignalCard key={s.id} signal={s} />
        ))}
      </div>
    </AppShell>
  );
}
