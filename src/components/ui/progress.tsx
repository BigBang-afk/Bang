import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
  colorClassName = "bg-accent",
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  colorClassName?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", colorClassName, barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
