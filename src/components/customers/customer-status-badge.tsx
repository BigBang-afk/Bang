import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  type CustomerStatusValue,
  type CustomerTypeValue,
} from "@/types/customers";

const STATUS_VARIANT: Record<CustomerStatusValue, BadgeProps["variant"]> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  BLOCKED: "danger",
};

export function CustomerStatusBadge({ status }: { status: CustomerStatusValue }) {
  return <Badge variant={STATUS_VARIANT[status]}>{CUSTOMER_STATUS_LABELS[status]}</Badge>;
}

const TYPE_VARIANT: Record<CustomerTypeValue, BadgeProps["variant"]> = {
  REGULAR: "neutral",
  VIP: "default",
  WHOLESALE: "warning",
  CORPORATE: "warning",
};

export function CustomerTypeBadge({ customerType }: { customerType: CustomerTypeValue }) {
  return <Badge variant={TYPE_VARIANT[customerType]}>{CUSTOMER_TYPE_LABELS[customerType]}</Badge>;
}
