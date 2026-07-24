"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SignalCard } from "@/components/signals/SignalCard";
import { useSessionStore } from "@/lib/sessionStore";
import type { Signal } from "@/lib/types";

export default function SignalsPage() {
  const { tradingMode } = useSessionStore();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`/api/signals/scan?mode=${tradingMode ?? "intraday"}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      setSignals(await res.json());
    } catch {
      setError("Couldn't reach MEXC right now — try again in a moment.");
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell title="AI Signals">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">
          High-confidence setups only (≥70% score), computed live from MEXC on every scan — nothing is stored
          between visits. Every signal carries a confidence breakdown and reasons, never a guarantee.
        </p>
        <button onClick={runScan} disabled={scanning} className="btn-primary shrink-0 ml-4">
          {scanning ? "Scanning market..." : "Scan Now"}
        </button>
      </div>

      {error && <p className="text-bear text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {!scanning && signals.length === 0 && !error && (
          <p className="text-gray-400 text-sm">No high-confidence signals right now — try again shortly.</p>
        )}
        {signals.map((s) => (
          <SignalCard key={s.id} signal={s} />
        ))}
      </div>
    </AppShell>
  );
}
