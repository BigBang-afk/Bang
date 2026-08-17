import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GrowthComparison } from "@/services/bi-dashboard.service";

/**
 * Renders a growth comparison's direction/percentage — see
 * ANALYTICS.md "Growth %". Deliberately never invents a percentage when
 * the previous period had no data: NO_COMPARISON renders plain text, not
 * a misleading "0%" or "∞%".
 */
export function GrowthIndicator({ growth }: { growth: GrowthComparison }) {
  if (growth.direction === "NO_COMPARISON") {
    return <span className="text-sm text-muted-foreground">NO COMPARISON (no prior-period data)</span>;
  }

  const Icon = growth.direction === "UP" ? ArrowUp : growth.direction === "DOWN" ? ArrowDown : Minus;
  const variant = growth.direction === "UP" ? "success" : growth.direction === "DOWN" ? "danger" : "neutral";

  return (
    <Badge variant={variant} className="text-sm">
      <Icon className="size-3" />
      {growth.direction} {growth.growthPercent}%
    </Badge>
  );
}
