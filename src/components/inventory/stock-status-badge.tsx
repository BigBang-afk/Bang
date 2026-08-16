import { Badge, type BadgeProps } from "@/components/ui/badge";
import { STOCK_STATUS_LABELS, type StockStatusValue } from "@/types/inventory";

const VARIANT_BY_STATUS: Record<StockStatusValue, BadgeProps["variant"]> = {
  IN_STOCK: "success",
  RESERVED: "warning",
  SOLD: "default",
  RETURNED: "neutral",
  DAMAGED: "danger",
  LOST: "danger",
};

export function StockStatusBadge({ status }: { status: StockStatusValue }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{STOCK_STATUS_LABELS[status]}</Badge>;
}
