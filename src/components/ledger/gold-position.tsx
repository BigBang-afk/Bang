import { Badge } from "@/components/ui/badge";
import { formatWeight } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";
import type { GoldPurity } from "@/generated/prisma/client";

export type GoldPositionEntry = {
  purity: GoldPurity;
  balance: string;
  status: "HOLDS_GOLD" | "OWES_GOLD" | "SETTLED";
};

/**
 * Always grams, always labeled HOLDS/OWES — never a bare "balance" number,
 * and never combined across purities. See GOLD-LEDGER.md.
 */
export function GoldPositionList({ positions }: { positions: GoldPositionEntry[] }) {
  if (positions.length === 0) {
    return <p className="text-sm text-muted-foreground">No gold currently on record.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {positions.map((position) => (
        <div
          key={position.purity}
          className="flex items-center justify-between rounded-md border border-border bg-surface-elevated px-3 py-2"
        >
          <span className="text-sm font-medium text-foreground">{PURITY_LABELS[position.purity]}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gold">{formatWeight(position.balance)}</span>
            <Badge
              variant={
                position.status === "HOLDS_GOLD" ? "warning" : position.status === "OWES_GOLD" ? "danger" : "neutral"
              }
            >
              {position.status === "HOLDS_GOLD" ? "Holds Gold" : position.status === "OWES_GOLD" ? "Owes Gold" : "Settled"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
