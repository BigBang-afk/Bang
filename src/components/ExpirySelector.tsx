"use client";

import { EXPIRIES, ExpiryKey } from "@/lib/types";

export function ExpirySelector({
  value,
  onChange,
}: {
  value: ExpiryKey;
  onChange: (expiry: ExpiryKey) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs uppercase tracking-wider text-muted">Expiry</label>
      <div className="flex gap-2">
        {EXPIRIES.map((e) => (
          <button
            key={e.key}
            onClick={() => onChange(e.key)}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
              value === e.key
                ? "border-accent bg-accent/20 text-white"
                : "border-bg-border bg-bg-card text-muted hover:text-white"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  );
}
