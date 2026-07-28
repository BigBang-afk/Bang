import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({ columns, rows, keyOf, onRowClick }: { columns: Column<T>[]; rows: T[]; keyOf: (row: T) => string; onRowClick?: (row: T) => void }) {
  return (
    <div className="overflow-x-auto glass-card">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-white/10 text-slate-400 uppercase text-xs tracking-wide">
            {columns.map((c) => (
              <th key={c.header} className={`px-4 py-3 font-medium ${c.className ?? ""}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyOf(row)}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-white/5 last:border-0 ${onRowClick ? "cursor-pointer hover:bg-white/5" : ""}`}
            >
              {columns.map((c) => (
                <td key={c.header} className={`px-4 py-3 text-slate-200 ${c.className ?? ""}`}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
