import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  positive,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  icon: LucideIcon;
}) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground-muted">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
          <Icon className="h-4 w-4 text-brand-green" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold">{value}</span>
        {delta && (
          <span
            className={cn(
              "text-xs font-semibold",
              positive ? "text-brand-green" : "text-danger",
            )}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
