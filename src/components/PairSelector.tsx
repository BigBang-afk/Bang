"use client";

import { Pair, PAIRS } from "@/lib/types";

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
        {PAIRS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}
