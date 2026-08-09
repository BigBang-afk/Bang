import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: "positive" | "negative" | "gold" | "accent" | "neutral";
  className?: string;
}) {
  const toneClass = {
    positive: "text-positive",
    negative: "text-negative",
    gold: "text-gold",
    accent: "text-accent",
    neutral: "text-foreground",
  }[tone];

  return (
    <Card className={cn("p-5 animate-fade-in", className)}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        {icon && <span className="text-muted-2">{icon}</span>}
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums", toneClass)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  );
}
