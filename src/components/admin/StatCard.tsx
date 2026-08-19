import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-sm border border-gold/20 bg-ivory p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-brown-light">{label}</p>
        {icon && <span className="text-gold-dark">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-2xl text-maroon">{value}</p>
      {hint && <p className="mt-1 text-xs text-brown-light">{hint}</p>}
    </div>
  );
}
