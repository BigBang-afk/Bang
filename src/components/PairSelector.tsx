"use client";

import { Pair, PAIR_GROUPS } from "@/lib/types";

export function PairSelector({
  value,
  onChange,
}: {
  value: Pair;
  onChange: (pair: Pair) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs uppercase tracking-wider text-muted">Pair</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Pair)}
        className="rounded-lg border border-bg-border bg-bg-card px-4 py-2.5 text-sm font-medium text-white focus:border-accent focus:outline-none"
      >
        {PAIR_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.pairs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
