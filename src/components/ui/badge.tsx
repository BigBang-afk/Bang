import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const variants = {
  positive: "bg-positive-bg text-positive",
  negative: "bg-negative-bg text-negative",
  neutral: "bg-surface-2 text-muted",
  gold: "bg-gold-bg text-gold",
  accent: "bg-accent-bg text-accent",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function ResultBadge({ result }: { result: "WIN" | "LOSS" | "BREAKEVEN" }) {
  if (result === "WIN") return <Badge variant="positive">● Win</Badge>;
  if (result === "LOSS") return <Badge variant="negative">● Loss</Badge>;
  return <Badge variant="neutral">● Breakeven</Badge>;
}
