"use client";

import { useCountdown } from "@/hooks/useCountdown";

function formatClock(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleTimeString([], { hour12: false });
}

export function CountdownTimer({
  entryTime,
  expiryTime,
}: {
  entryTime: number;
  expiryTime: number;
}) {
  const remaining = useCountdown(expiryTime);
  const total = Math.max(1, expiryTime - entryTime);
  const pct = Math.min(100, Math.max(0, (remaining / total) * 100));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Entry {formatClock(entryTime)}</span>
        <span>Expiry {formatClock(expiryTime)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-center text-2xl font-bold tabular-nums text-white">
        {remaining}s
      </div>
    </div>
  );
}
