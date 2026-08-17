import "server-only";

/**
 * Provider-agnostic owner-notification abstraction — see
 * AUTOMATED-REPORTS.md "Notification architecture". No business logic
 * imports a specific vendor's SDK; everything sends through this
 * interface, prepared for a real email/WhatsApp Business API/push
 * provider later. Phase 8 ships only `MockNotificationProvider` — no real
 * WhatsApp automation, no personal-account automation, matching the exact
 * same "mock-only, provider abstraction ready" discipline Phase 7's
 * MarketingProvider established.
 */

export type NotificationChannel = "EMAIL" | "WHATSAPP" | "PUSH";

export type NotificationKind =
  | "DAILY_REPORT"
  | "CRITICAL_ALERT"
  | "CASH_SHORTAGE"
  | "GOLD_DISCREPANCY"
  | "MAJOR_EXPENSE"
  | "SALES_DROP"
  | "INVENTORY_ALERT";

export type SendNotificationInput = {
  to: string;
  channel: NotificationChannel;
  kind: NotificationKind;
  subject: string;
  body: string;
};

export type SendNotificationResult = {
  status: "SENT" | "FAILED";
  providerMessageId: string | null;
  error?: string;
};

export interface NotificationProvider {
  readonly providerName: string;
  sendNotification(input: SendNotificationInput): Promise<SendNotificationResult>;
}
