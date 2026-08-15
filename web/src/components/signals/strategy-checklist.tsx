import { StrategyVote } from "@/lib/signals/engine";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function StrategyChecklist({ votes }: { votes: StrategyVote[] }) {
  return (
    <div className="flex flex-col divide-y divide-border-subtle">
      {votes.map((v) => (
        <div key={v.key} className="flex items-start gap-3 py-3">
          {v.vote === 1 ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
          ) : v.vote === -1 ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          ) : (
            <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
          )}
          <div>
            <p
              className={cn(
                "text-sm font-medium",
                v.vote === 1 && "text-brand-green",
                v.vote === -1 && "text-danger",
              )}
            >
              {v.name}
            </p>
            <p className="text-xs text-foreground-muted">{v.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
