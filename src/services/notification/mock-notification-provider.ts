import "server-only";
import crypto from "node:crypto";
import type { NotificationProvider, SendNotificationInput, SendNotificationResult } from "@/services/notification/notification-provider";

/**
 * The development/test notification provider — see AUTOMATED-REPORTS.md
 * "Notification architecture". Sends nothing over the network;
 * deterministic given its input so tests never depend on an external
 * service. A recipient with no plausible address (empty string) always
 * fails, mirroring how a real provider would reject it.
 */
export class MockNotificationProvider implements NotificationProvider {
  readonly providerName = "mock";

  async sendNotification(input: SendNotificationInput): Promise<SendNotificationResult> {
    if (!input.to.trim()) {
      return { status: "FAILED", providerMessageId: null, error: "NO_RECIPIENT" };
    }
    return { status: "SENT", providerMessageId: `mock-notify-${crypto.randomUUID()}` };
  }
}

let sharedProvider: NotificationProvider | null = null;

/** Only "mock" is implemented in Phase 8 — see AUTOMATED-REPORTS.md. */
export function getNotificationProvider(): NotificationProvider {
  if (!sharedProvider) sharedProvider = new MockNotificationProvider();
  return sharedProvider;
}
