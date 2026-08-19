import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <div className={clsx("rounded-sm border border-gold/20 bg-ivory shadow-sm", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-gold/15 px-5 py-4">
          {title && <h2 className="font-display text-lg text-maroon">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "gold" }) {
  const tones: Record<string, string> = {
    neutral: "bg-cream-dark text-brown-light",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    gold: "bg-gold-light text-maroon-dark",
  };
  return <span className={clsx("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}
