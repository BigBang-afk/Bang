import "server-only";
import crypto from "node:crypto";
import type {
  MarketingProvider,
  SendMessageInput,
  SendTemplateInput,
  SendResult,
  MessageStatusResult,
  WebhookEvent,
} from "@/services/marketing/marketing-provider";

/**
 * The development/test marketing provider — see WHATSAPP-INTEGRATION.md
 * "Mock provider". Sends nothing over the network. Deterministic given its
 * input, so tests never depend on timing or an external service being up.
 * A phone number that doesn't look like a real number always fails with a
 * PERMANENT (non-retryable) INVALID_NUMBER error, matching how a real
 * provider would behave — this lets retry-logic tests exercise the
 * "don't retry a permanent failure" rule without needing a live provider.
 */

const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

function isValidPhone(phone: string): boolean {
  return PHONE_PATTERN.test(phone.replace(/[\s-]/g, ""));
}

export class MockMarketingProvider implements MarketingProvider {
  readonly providerName = "mock";
  /** Injectable for tests that need to exercise a transient-failure/retry path. */
  private forceTransientFailureOnce = false;

  simulateNextTransientFailure(): void {
    this.forceTransientFailureOnce = true;
  }

  async sendMessage(input: SendMessageInput): Promise<SendResult> {
    if (!isValidPhone(input.to)) {
      return { providerMessageId: null, status: "FAILED", error: "INVALID_NUMBER", retryable: false };
    }
    if (this.forceTransientFailureOnce) {
      this.forceTransientFailureOnce = false;
      return { providerMessageId: null, status: "FAILED", error: "TEMPORARY_PROVIDER_ERROR", retryable: true };
    }
    return { providerMessageId: `mock-${crypto.randomUUID()}`, status: "SENT" };
  }

  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    return this.sendMessage({ to: input.to, message: input.templateName, campaignMessageId: input.campaignMessageId });
  }

  async getMessageStatus(providerMessageId: string): Promise<MessageStatusResult> {
    return { providerMessageId, status: "SENT" };
  }

  handleWebhook(rawBody: string, signatureHeader: string | null): WebhookEvent[] {
    const secret = process.env.MARKETING_MOCK_WEBHOOK_SECRET ?? "mock-webhook-secret";
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!signatureHeader || signatureHeader !== expected) return [];

    try {
      const payload = JSON.parse(rawBody) as {
        events?: { providerMessageId: string; kind: string; occurredAt: string; replyText?: string }[];
      };
      if (!Array.isArray(payload.events)) return [];
      return payload.events
        .filter((e) => ["delivered", "read", "failed", "reply"].includes(e.kind))
        .map((e) => ({
          providerMessageId: e.providerMessageId,
          kind: e.kind as WebhookEvent["kind"],
          occurredAt: new Date(e.occurredAt),
          replyText: e.replyText,
        }));
    } catch {
      return [];
    }
  }
}

let sharedProvider: MarketingProvider | null = null;

/** Only "mock" is implemented in Phase 7 — see WHATSAPP-INTEGRATION.md. */
export function getMarketingProvider(): MarketingProvider {
  if (!sharedProvider) sharedProvider = new MockMarketingProvider();
  return sharedProvider;
}
