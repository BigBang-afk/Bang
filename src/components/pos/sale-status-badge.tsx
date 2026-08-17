import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  SALE_STATUS_LABELS,
  derivePaymentStatus,
  type SaleStatusValue,
} from "@/types/sales";

const VARIANT_BY_STATUS: Record<SaleStatusValue, BadgeProps["variant"]> = {
  COMPLETED: "success",
  PARTIALLY_RETURNED: "warning",
  RETURNED: "neutral",
};

export function SaleStatusBadge({ status }: { status: SaleStatusValue }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{SALE_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ balanceAmount }: { balanceAmount: string | number }) {
  const status = derivePaymentStatus(balanceAmount);
  return status === "PAID" ? (
    <Badge variant="success">Paid</Badge>
  ) : (
    <Badge variant="warning">On Credit</Badge>
  );
}
