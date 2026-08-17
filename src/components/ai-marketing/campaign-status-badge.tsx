import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { CampaignStatusValue, MessageStatusValue } from "@/types/marketing";

const CAMPAIGN_VARIANTS: Record<CampaignStatusValue, BadgeProps["variant"]> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "warning",
  SCHEDULED: "default",
  RUNNING: "success",
  PAUSED: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export function CampaignStatusBadge({ status }: { status: string }) {
  const key = status as CampaignStatusValue;
  const label = status === "PENDING_APPROVAL" ? "PENDING APPROVAL" : status;
  return <Badge variant={CAMPAIGN_VARIANTS[key] ?? "neutral"}>{label}</Badge>;
}

const MESSAGE_VARIANTS: Record<MessageStatusValue, BadgeProps["variant"]> = {
  QUEUED: "neutral",
  PROCESSING: "neutral",
  SENT: "default",
  DELIVERED: "success",
  READ: "success",
  FAILED: "danger",
  OPTED_OUT: "warning",
  CANCELLED: "neutral",
};

export function MessageStatusBadge({ status }: { status: string }) {
  const key = status as MessageStatusValue;
  return <Badge variant={MESSAGE_VARIANTS[key] ?? "neutral"}>{status}</Badge>;
}
