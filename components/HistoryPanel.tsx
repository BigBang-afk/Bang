"use client";

import type { HistoryEntry } from "@/lib/history";

const SIGNAL_COLOR: Record<HistoryEntry["signal"], string> = {
  CALL: "text-emerald-400",
  PUT: "text-red-400",
  WAIT: "text-amber-400",
};

export default function HistoryPanel({
  history,
  onClear,
}: {
  history: HistoryEntry[];
  onClear: () => void;
}) {
  if (history.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-slate-200">Scan history</h3>
        <p className="mt-2 text-xs text-slate-500">
          Your past scans on this device will show up here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Scan history</h3>
        <button
          onClick={onClear}
          className="text-xs text-slate-500 underline hover:text-slate-300"
        >
          Clear
        </button>
      </div>
      <ul className="mt-3 space-y-2 max-h-96 overflow-y-auto pr-1">
        {history.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 rounded-lg bg-slate-950/50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.thumbnail}
              alt="scan thumbnail"
              className="h-10 w-16 rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs">
                <span className={`font-semibold ${SIGNAL_COLOR[entry.signal]}`}>
                  {entry.signal}
                </span>{" "}
                <span className="text-slate-400">{entry.confidence}%</span>
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {entry.topPattern ?? "no pattern"} · {entry.candleCount} candles
              </p>
            </div>
            <p className="shrink-0 text-[10px] text-slate-600">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
