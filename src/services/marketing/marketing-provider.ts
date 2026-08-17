import "server-only";

/**
 * Provider-agnostic WhatsApp/marketing-channel abstraction — see
 * WHATSAPP-INTEGRATION.md. No business logic (campaign, queue, message
 * generator) imports a specific vendor's SDK; everything sends through
 * this interface, prepared for an official WhatsApp Business
 * API/provider later. This phase ships only `MockMarketingProvider` — see
 * WHATSAPP-INTEGRATION.md "Do not build yet" for why no real, unofficial,
 * or scraped WhatsApp integration exists here.
 */

export type SendMessageInput = {
  to: string;
  message: string;
  /** Our own CampaignMessage.id, so a mock/real provider can echo it back in logs without needing a lookup. */
  campaignMessageId: string;
};

export type SendMessageOutcome = "SENT" | "FAILED";

export type SendResult = {
  providerMessageId: string | null;
  status: SendMessageOutcome;
  /** Set only on FAILED. */
  error?: string;
  /** Whether a FAILED result is worth retrying (a transient provider error) vs. permanent (invalid number, opted out). */
  retryable?: boolean;
};

export type SendTemplateInput = {
  to: string;
  templateName: string;
  variables: Record<string, string>;
  campaignMessageId: string;
};

export type ProviderMessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";

export type MessageStatusResult = {
  providerMessageId: string;
  status: ProviderMessageStatus;
  error?: string;
};

export type WebhookEventKind = "delivered" | "read" | "failed" | "reply";

export type WebhookEvent = {
  providerMessageId: string;
  kind: WebhookEventKind;
  occurredAt: Date;
  /** Present only for a "reply" event — the customer's raw reply text, used only for STOP/UNSUBSCRIBE detection (see marketing-consent.service.ts) and never stored longer than operationally needed. */
  replyText?: string;
};

export interface MarketingProvider {
  readonly providerName: string;
  sendMessage(input: SendMessageInput): Promise<SendResult>;
  sendTemplate(input: SendTemplateInput): Promise<SendResult>;
  getMessageStatus(providerMessageId: string): Promise<MessageStatusResult>;
  /**
   * Parses and validates an inbound webhook payload into normalized
   * events. Implementations MUST verify the payload's authenticity
   * according to the provider's own signing scheme before trusting it —
   * never process an unverified request body. Returns an empty array for
   * an unrecognized/invalid payload rather than throwing, so one bad
   * event can't take down the whole webhook endpoint.
   */
  handleWebhook(rawBody: string, signatureHeader: string | null): WebhookEvent[];
}
