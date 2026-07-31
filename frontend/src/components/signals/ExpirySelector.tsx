"use client";

import { useEffect, useState } from "react";

import { API_URL, formatExpiryLabel } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { ExpiryAvailability } from "@/types";

interface ExpirySelectorProps {
  symbol: string;
  selected: number;
  onSelect: (seconds: number) => void;
  disabled?: boolean;
}

export function ExpirySelector({ symbol, selected, onSelect, disabled }: ExpirySelectorProps): React.ReactElement {
  const [expiries, setExpiries] = useState<ExpiryAvailability[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const response = await fetch(`${API_URL}/api/v1/assets/${encodeURIComponent(symbol)}/expiries`);
      if (!response.ok || cancelled) return;
      setExpiries(await response.json());
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {expiries.map((expiry) => (
        <button
          key={expiry.seconds}
          type="button"
          disabled={disabled || !expiry.enabled}
          title={expiry.reason ?? undefined}
          onClick={() => onSelect(expiry.seconds)}
          aria-pressed={selected === expiry.seconds}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
            selected === expiry.seconds
              ? "border-terminal-accent bg-terminal-accent/20 text-blue-300"
              : "border-terminal-border bg-terminal-panel text-gray-300 hover:bg-gray-800",
            !expiry.enabled && "cursor-not-allowed opacity-40 line-through"
          )}
        >
          {formatExpiryLabel(expiry.seconds)}
        </button>
      ))}
      {expiries.some((e) => !e.enabled) && (
        <span className="text-xs text-amber-400">
          Some expiries are disabled - the active data provider does not supply sufficiently granular realtime ticks.
        </span>
      )}
    </div>
  );
}
