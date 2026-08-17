import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  KARIGAR_STATUS_LABELS,
  KARIGAR_SPECIALIZATION_LABELS,
  type KarigarStatusValue,
  type KarigarSpecializationValue,
} from "@/types/karigars";

const STATUS_VARIANT: Record<KarigarStatusValue, BadgeProps["variant"]> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  BLOCKED: "danger",
};

export function KarigarStatusBadge({ status }: { status: KarigarStatusValue }) {
  return <Badge variant={STATUS_VARIANT[status]}>{KARIGAR_STATUS_LABELS[status]}</Badge>;
}

export function KarigarSpecializationBadge({ specialization }: { specialization: KarigarSpecializationValue }) {
  return <Badge variant="neutral">{KARIGAR_SPECIALIZATION_LABELS[specialization]}</Badge>;
}
