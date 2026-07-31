import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "call" | "put" | "neutral" | "info" | "warning";

const toneClasses: Record<BadgeTone, string> = {
  call: "bg-green-500/15 text-green-400 border-green-500/30",
  put: "bg-red-500/15 text-red-400 border-red-500/30",
  neutral: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
