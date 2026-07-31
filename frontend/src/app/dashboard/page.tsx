"use client";

import { useEffect, useState } from "react";

import { API_URL, WS_URL } from "@/lib/config";
import { useWebSocket } from "@/hooks/useWebSocket";
import { usePreferencesStore } from "@/store/preferences";
import { AssetSelector } from "@/components/signals/AssetSelector";
import { ExpirySelector } from "@/components/signals/ExpirySelector";
import { SignalCard } from "@/components/signals/SignalCard";
import { StrategySelector } from "@/components/signals/StrategySelector";
import { LiveChart } from "@/components/chart/LiveChart";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Signal } from "@/types";

const ACTIVE_STATUSES = new Set(["PENDING_ENTRY", "ENTRY_WINDOW_CLOSED", "ACTIVE", "EXPIRING", "CHECKING_RESULT"]);

export default function DashboardPage(): React.ReactElement {
  const {
    selectedAssetSymbol,
    selectedStrategyCode,
    aiAutoEnabled,
    selectedTimeframe,
    selectedExpirySeconds,
    soundEnabled,
    setSelectedAsset,
    setSelectedStrategy,
    setAiAutoEnabled,
    setSelectedExpirySeconds,
  } = usePreferencesStore();

  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const response = await fetch(
        `${API_URL}/api/v1/signals/live?symbol=${encodeURIComponent(selectedAssetSymbol)}`
      );
      if (!response.ok || cancelled) return;
      setSignals(await response.json());
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedAssetSymbol]);

  useWebSocket(`${WS_URL}/ws/signals/${encodeURIComponent(selectedAssetSymbol)}`, {
    onMessage: (data) => {
      const msg = data as { type?: string; public_signal_id?: string };
      if (msg?.type === "new_signal" && msg.public_signal_id) {
        fetch(`${API_URL}/api/v1/signals/${msg.public_signal_id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((signal: Signal | null) => {
            if (signal) setSignals((prev) => [signal, ...prev].slice(0, 50));
          })
          .catch(() => undefined);
      }
    },
  });

  const activeSignal = signals.find((s) => ACTIVE_STATUSES.has(s.status)) ?? null;
  const recentCompleted = signals.filter((s) => s.status === "COMPLETED").slice(0, 5);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <AssetSelector selected={selectedAssetSymbol} onSelect={setSelectedAsset} />
          <ExpirySelector
            symbol={selectedAssetSymbol}
            selected={selectedExpirySeconds}
            onSelect={setSelectedExpirySeconds}
          />
          <Badge tone="info">{selectedTimeframe} timeframe</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Live Chart - {selectedAssetSymbol}</CardTitle>
          <LiveChart symbol={selectedAssetSymbol} timeframe={selectedTimeframe} activeSignal={activeSignal} />
        </Card>

        <div className="space-y-4">
          {activeSignal ? (
            <SignalCard signal={activeSignal} soundEnabled={soundEnabled} />
          ) : (
            <Card className="text-center text-sm text-gray-400">
              No active signal for {selectedAssetSymbol} right now. The engine defaults to NO TRADE until
              conditions are met.
            </Card>
          )}

          <Card>
            <CardTitle>Recent Results</CardTitle>
            <ul className="space-y-1.5 text-sm">
              {recentCompleted.length === 0 && <li className="text-gray-500">No completed signals yet.</li>}
              {recentCompleted.map((s) => (
                <li key={s.public_signal_id} className="flex items-center justify-between">
                  <span className="text-gray-300">
                    {s.strategy_name} &middot; {s.direction}
                  </span>
                  <Badge tone={s.result === "WIN" ? "call" : s.result === "LOSS" ? "put" : "neutral"}>
                    {s.result}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card>
        <CardTitle>Strategy Selection</CardTitle>
        <StrategySelector
          selectedCode={selectedStrategyCode}
          aiAutoEnabled={aiAutoEnabled}
          onSelectStrategy={setSelectedStrategy}
          onToggleAiAuto={setAiAutoEnabled}
        />
      </Card>
    </div>
  );
}
