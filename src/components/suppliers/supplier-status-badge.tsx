import { Badge, type BadgeProps } from "@/components/ui/badge";
import { SUPPLIER_STATUS_LABELS, type SupplierStatusValue } from "@/types/suppliers";

const STATUS_VARIANT: Record<SupplierStatusValue, BadgeProps["variant"]> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  BLOCKED: "danger",
};

export function SupplierStatusBadge({ status }: { status: SupplierStatusValue }) {
  return <Badge variant={STATUS_VARIANT[status]}>{SUPPLIER_STATUS_LABELS[status]}</Badge>;
}
