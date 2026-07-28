import type { ReactNode } from "react";

export function FilterPanel({ children }: { children: ReactNode }) {
  return <div className="glass-card p-4 flex flex-wrap gap-3 items-end">{children}</div>;
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  );
}
