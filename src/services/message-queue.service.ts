import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { getSystemSetting } from "@/services/system-setting.service";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import { substitutePlaceholders } from "@/lib/message-placeholders";
import { resolveAudience, type AudienceFilters } from "@/services/audience-builder.service";
import { getGoldRatePlaceholderValue } from "@/services/gold-rate-marketing.service";
import { getMarketingProvider } from "@/services/marketing/mock-marketing-provider";
import { handleInboundReplyForOptOut } from "@/services/marketing-consent.service";
import { markCampaignCompletedIfFinished } from "@/services/campaign.service";
import type { WebhookEvent } from "@/services/marketing/marketing-provider";

/**
 * The campaign send queue — see CAMPAIGN-SYSTEM.md "Message queue" /
 * "Rate limiting" / "Retry logic". Personalization (placeholder
 * substitution) happens exactly once, at queue time, from real per-
 * customer/per-campaign data — the template itself never carries a
 * resolved value. {{gold_rate}} is always resolved here from
 * gold-rate-marketing.service.ts's live lookup, never anything the
 * AiProvider produced — see the CRITICAL TEST in
 * tests/message-queue.service.integration.test.ts.
 */

export class CampaignNotFoundForQueueError extends Error {
  constructor(message = "Campaign not found.") {
    super(message);
    this.name = "CampaignNotFoundForQueueError";
  }
}

export async function queueCampaignMessages(campaignId: string, userId: string): Promise<{ queued: number }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { product: { include: { product: true } } },
  });
  if (!campaign) throw new CampaignNotFoundForQueueError();

  const audience = await resolveAudience((campaign.audienceFilters as AudienceFilters) ?? {}, campaignId);
  if (audience.eligibleCustomerIds.length === 0) return { queued: 0 };

  const needsGoldRate = campaign.messageTemplate.includes("{{gold_rate}}");
  const [shopName, goldRateValue, customers] = await Promise.all([
    getSystemSetting(SETTINGS_KEYS.BUSINESS_NAME),
    needsGoldRate ? getGoldRatePlaceholderValue() : Promise.resolve(null),
    prisma.customer.findMany({ where: { id: { in: audience.eligibleCustomerIds } }, select: { id: true, name: true } }),
  ]);

  const rows = customers.map((customer) => ({
    campaignId,
    customerId: customer.id,
    channel: campaign.channel,
    message: substitutePlaceholders(campaign.messageTemplate, {
      customer_name: customer.name,
      product_name: campaign.product?.product.name,
      shop_name: shopName,
      gold_rate: goldRateValue ?? undefined,
      offer: campaign.offer ?? undefined,
      expiry_date: campaign.expiryDate ? campaign.expiryDate.toISOString().slice(0, 10) : undefined,
    }),
    status: "QUEUED" as const,
  }));

  await prisma.campaignMessage.createMany({ data: rows });
  await writeAuditLog({ userId, action: "MESSAGE_QUEUED", entity: "Campaign", entityId: campaignId, metadata: { count: rows.length } });
  return { queued: rows.length };
}

async function getMarketingRateLimits() {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_MINUTE, SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_HOUR, SETTINGS_KEYS.MARKETING_MAX_RETRIES] } },
  });
  const get = (key: string, fallback: number) => {
    const row = rows.find((r) => r.key === key);
    const parsed = row ? Number.parseInt(row.value, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    perMinute: get(SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_MINUTE, 20),
    perHour: get(SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_HOUR, 200),
    maxRetries: get(SETTINGS_KEYS.MARKETING_MAX_RETRIES, 3),
  };
}

/** Exponential backoff, capped at 30 minutes — pure and testable. */
export function computeBackoffDelayMs(attempt: number): number {
  return Math.min(30 * 60 * 1000, 1000 * 2 ** attempt);
}

/** Errors a real provider would never usefully retry — see CAMPAIGN-SYSTEM.md "Retry logic". */
export const PERMANENT_FAILURE_ERRORS = ["OPTED_OUT", "INVALID_NUMBER", "PERMANENT_FAILURE"];

/**
 * Sends up to `limit` due QUEUED messages, respecting the configured
 * per-minute/per-hour rate limits (never attempts to exceed them, and
 * never tries to work around a provider's own limit — see
 * CAMPAIGN-SYSTEM.md "Rate limiting"). A transient failure is requeued
 * with exponential backoff up to the configured max retries; a permanent
 * failure (or retries exhausted) is left FAILED and never retried again.
 */
export async function processMessageQueue(limit = 50): Promise<{ processed: number; sent: number; failed: number; requeued: number }> {
  const [limits, sentLastMinute, sentLastHour] = await Promise.all([
    getMarketingRateLimits(),
    prisma.campaignMessage.count({ where: { sentAt: { gte: new Date(Date.now() - 60 * 1000) } } }),
    prisma.campaignMessage.count({ where: { sentAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } }),
  ]);

  const allowedByMinute = Math.max(0, limits.perMinute - sentLastMinute);
  const allowedByHour = Math.max(0, limits.perHour - sentLastHour);
  const batchSize = Math.min(limit, allowedByMinute, allowedByHour);
  if (batchSize <= 0) return { processed: 0, sent: 0, failed: 0, requeued: 0 };

  const due = await prisma.campaignMessage.findMany({
    where: { status: "QUEUED", OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }] },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    include: { customer: { select: { phone: true } } },
  });

  const provider = getMarketingProvider();
  let sent = 0;
  let failed = 0;
  let requeued = 0;
  const affectedCampaignIds = new Set<string>();

  for (const row of due) {
    await prisma.campaignMessage.update({ where: { id: row.id }, data: { status: "PROCESSING" } });
    const result = await provider.sendMessage({ to: row.customer.phone, message: row.message, campaignMessageId: row.id });

    if (result.status === "SENT") {
      await prisma.campaignMessage.update({
        where: { id: row.id },
        data: { status: "SENT", providerMessageId: result.providerMessageId, sentAt: new Date(), error: null, nextRetryAt: null },
      });
      sent += 1;
    } else {
      const isPermanent = result.retryable === false || PERMANENT_FAILURE_ERRORS.includes(result.error ?? "") || row.attempts + 1 >= limits.maxRetries;
      if (isPermanent) {
        await prisma.campaignMessage.update({
          where: { id: row.id },
          data: { status: result.error === "OPTED_OUT" ? "OPTED_OUT" : "FAILED", error: result.error, attempts: row.attempts + 1 },
        });
        failed += 1;
      } else {
        const nextAttempt = row.attempts + 1;
        await prisma.campaignMessage.update({
          where: { id: row.id },
          data: {
            status: "QUEUED",
            attempts: nextAttempt,
            error: result.error,
            nextRetryAt: new Date(Date.now() + computeBackoffDelayMs(nextAttempt)),
          },
        });
        requeued += 1;
      }
    }
    affectedCampaignIds.add(row.campaignId);
  }

  for (const campaignId of affectedCampaignIds) await markCampaignCompletedIfFinished(campaignId);

  return { processed: due.length, sent, failed, requeued };
}

/** Applies a validated webhook event to the matching CampaignMessage — see WHATSAPP-INTEGRATION.md "Webhook architecture". */
export async function applyWebhookEvent(event: WebhookEvent): Promise<void> {
  const message = await prisma.campaignMessage.findFirst({ where: { providerMessageId: event.providerMessageId } });
  if (!message) return;

  switch (event.kind) {
    case "delivered":
      await prisma.campaignMessage.update({ where: { id: message.id }, data: { status: "DELIVERED", deliveredAt: event.occurredAt } });
      break;
    case "read":
      await prisma.campaignMessage.update({ where: { id: message.id }, data: { status: "READ", readAt: event.occurredAt } });
      break;
    case "failed":
      await prisma.campaignMessage.update({ where: { id: message.id }, data: { status: "FAILED", error: "PROVIDER_REPORTED_FAILURE" } });
      break;
    case "reply":
      await prisma.campaignMessage.update({ where: { id: message.id }, data: { repliedAt: event.occurredAt } });
      if (event.replyText) await handleInboundReplyForOptOut(message.customerId, event.replyText);
      break;
  }
}
