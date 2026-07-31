"use client";

import { useEffect, useState } from "react";

import { API_URL, WS_URL } from "@/lib/config";
import { useWebSocket } from "@/hooks/useWebSocket";
import { SignalCard } from "@/components/signals/SignalCard";
import { Card } from "@/components/ui/card";
import type { Signal } from "@/types";

const ACTIVE_STATUSES = new Set(["PENDING_ENTRY", "ENTRY_WINDOW_CLOSED", "ACTIVE", "EXPIRING", "CHECKING_RESULT"]);

export default function LiveSignalsPage(): React.ReactElement {
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_URL}/api/v1/signals/live`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => !cancelled && setSignals(data));
    return () => {
      cancelled = true;
    };
  }, []);

  useWebSocket(`${WS_URL}/ws/signals`, {
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

  const active = signals.filter((s) => ACTIVE_STATUSES.has(s.status));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {active.length === 0 && (
        <Card className="col-span-full text-center text-sm text-gray-400">
          No active signals across any asset right now.
        </Card>
      )}
      {active.map((signal) => (
        <SignalCard key={signal.public_signal_id} signal={signal} />
      ))}
    </div>
  );
}
