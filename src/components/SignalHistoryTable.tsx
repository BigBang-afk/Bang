"use client";

interface HistoryRow {
  id: string;
  createdAt: string;
  pair: string;
  expiry: string;
  direction: string;
  confidence: number;
  result: string;
  reason: string;
}

const RESULT_STYLE: Record<string, string> = {
  WIN: "text-call-text",
  LOSS: "text-put-text",
  PENDING: "text-muted",
};

export function SignalHistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-bg-border bg-bg-card p-6 text-center text-sm text-muted">
        No signals recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-bg-border text-xs uppercase tracking-wider text-muted">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Pair</th>
            <th className="px-4 py-3">Expiry</th>
            <th className="px-4 py-3">Signal</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Result</th>
            <th className="px-4 py-3">Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const d = new Date(r.createdAt);
            return (
              <tr key={r.id} className="border-b border-bg-border/60 last:border-0">
                <td className="px-4 py-3 text-muted">{d.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-muted">{d.toLocaleTimeString()}</td>
                <td className="px-4 py-3 font-medium text-white">{r.pair}</td>
                <td className="px-4 py-3 text-muted">{r.expiry === "SEC15" ? "15s" : "1m"}</td>
                <td
                  className={`px-4 py-3 font-bold ${
                    r.direction === "CALL" ? "text-call-text" : "text-put-text"
                  }`}
                >
                  {r.direction}
                </td>
                <td className="px-4 py-3 text-white">{r.confidence}%</td>
                <td className={`px-4 py-3 font-semibold ${RESULT_STYLE[r.result] ?? ""}`}>
                  {r.result}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-muted" title={r.reason}>
                  {r.reason}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
