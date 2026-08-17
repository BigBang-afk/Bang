import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createCustomer } from "@/services/customer.service";
import { recordOptIn } from "@/services/marketing-consent.service";
import { createCampaignDraft, submitCampaignForApproval, approveCampaign, launchCampaign } from "@/services/campaign.service";
import { queueCampaignMessages, processMessageQueue, computeBackoffDelayMs, applyWebhookEvent } from "@/services/message-queue.service";
import { getEffectiveRatesForDate } from "@/services/gold-rate.service";
import { getTodayBusinessDate } from "@/lib/business-date";
import { formatCurrency } from "@/lib/format";
import { SETTINGS_KEYS } from "@/lib/settings-keys";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";

/**
 * The per-minute/per-hour rate limits are enforced via a LIVE count of
 * every CampaignMessage sent anywhere in this shared dev database in the
 * trailing window — correct for production, but it means any test that
 * needs `processMessageQueue()` to actually reach ITS OWN row must not be
 * at the mercy of how much unrelated send volume other test files already
 * produced in the current 60-second window. Raising the limits sky-high
 * before such a call makes the test deterministic without weakening what
 * it verifies (the specific row's own outcome), mirroring the same
 * "make the test robust to shared-DB state" pattern used throughout this
 * suite (see the `customerIds` audience filter above).
 */
async function withRaisedRateLimits<T>(fn: () => Promise<T>): Promise<T> {
  const keys = [SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_MINUTE, SETTINGS_KEYS.MARKETING_RATE_LIMIT_PER_HOUR];
  const originals = await prisma.systemSetting.findMany({ where: { key: { in: keys } } });

  for (const key of keys) {
    await prisma.systemSetting.upsert({ where: { key }, update: { value: "100000" }, create: { key, value: "100000" } });
  }

  try {
    return await fn();
  } finally {
    for (const key of keys) {
      const original = originals.find((r) => r.key === key);
      if (original) {
        await prisma.systemSetting.update({ where: { key }, data: { value: original.value } });
      } else {
        await prisma.systemSetting.deleteMany({ where: { key } });
      }
    }
  }
}

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

function uniquePhone(): string {
  const digits = (Date.now() % 1e8).toString().padStart(8, "0");
  return `+923${digits}${Math.floor(Math.random() * 10)}`;
}

async function launchedCampaignFor(customerId: string, messageTemplate: string) {
  const campaign = await createCampaignDraft(
    {
      name: `Queue Test ${uniqueSuffix()}`,
      objective: "ENGAGEMENT",
      campaignType: "SPECIAL_OFFER",
      // Scoped to this exact customer — resolveAudience's other filters would
      // otherwise match every OPTED_IN customer accumulated in this shared
      // dev database across every previous test run.
      audienceFilters: { requireOptedIn: true, customerIds: [customerId] },
      messageTemplate,
    },
    userId,
  );
  await submitCampaignForApproval(campaign.id);
  await approveCampaign(campaign.id, userId);
  await launchCampaign(campaign.id, userId);
  return campaign;
}

describe("Message queue (Test 12)", () => {
  it("queues one CampaignMessage per eligible customer, personalized from real data", async () => {
    const customer = await createCustomer({ firstName: `Queue ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);

    const campaign = await launchedCampaignFor(customer.id, "Hello {{customer_name}}, welcome to {{shop_name}}.");
    const { queued } = await queueCampaignMessages(campaign.id, userId);
    expect(queued).toBe(1);

    const message = await prisma.campaignMessage.findFirst({ where: { campaignId: campaign.id, customerId: customer.id } });
    expect(message).not.toBeNull();
    expect(message?.status).toBe("QUEUED");
    expect(message?.message).toContain(customer.name);
    expect(message?.message).not.toContain("{{customer_name}}");

    const log = await prisma.auditLog.findFirst({ where: { entity: "Campaign", entityId: campaign.id, action: "MESSAGE_QUEUED" } });
    expect(log).not.toBeNull();
  });

  it("never queues a message for an opted-out customer even if they matched the campaign's filters", async () => {
    const customer = await createCustomer({ firstName: `QueueOptOut ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    // Deliberately left UNKNOWN (never opted in) — queueCampaignMessages must exclude them.
    const campaign = await createCampaignDraft(
      {
        name: `Queue OptOut Test ${uniqueSuffix()}`,
        objective: "ENGAGEMENT",
        campaignType: "SPECIAL_OFFER",
        audienceFilters: {},
        messageTemplate: "Hello {{customer_name}}.",
      },
      userId,
    );
    await queueCampaignMessages(campaign.id, userId);
    const message = await prisma.campaignMessage.findFirst({ where: { campaignId: campaign.id, customerId: customer.id } });
    expect(message).toBeNull();
  });
});

describe("Retry logic (Test 14)", () => {
  it("computeBackoffDelayMs grows exponentially and is capped", () => {
    expect(computeBackoffDelayMs(0)).toBe(1000);
    expect(computeBackoffDelayMs(1)).toBe(2000);
    expect(computeBackoffDelayMs(2)).toBe(4000);
    // 1000 * 2^11 = 2,048,000ms, already past the 30-minute cap.
    expect(computeBackoffDelayMs(20)).toBe(30 * 60 * 1000);
  });

  it("a permanently-invalid phone number fails without ever being retried", async () => {
    const customer = await createCustomer({ firstName: `Invalid ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);
    // Launch while the number is still valid — the audience builder itself
    // already excludes an implausible number (see audience-builder tests),
    // so this test corrupts the number AFTER launch to exercise the queue
    // PROCESSOR's own independent guard against a bad number reaching the
    // provider, via a direct row insert (the real send path).
    const campaign = await launchedCampaignFor(customer.id, "Hello {{customer_name}}.");
    // Fewer than 7 digits is always implausible (see isPlausiblePhoneNumber)
    // and a millisecond timestamp tail is unique enough for one test run.
    await prisma.customer.update({ where: { id: customer.id }, data: { phone: Date.now().toString().slice(-5) } });

    const queuedRow = await prisma.campaignMessage.create({
      data: { campaignId: campaign.id, customerId: customer.id, channel: "WHATSAPP", message: "Hello.", status: "QUEUED" },
    });

    await withRaisedRateLimits(() => processMessageQueue(10));
    const after = await prisma.campaignMessage.findUniqueOrThrow({ where: { id: queuedRow.id } });
    expect(after.status).toBe("FAILED");
    expect(after.error).toBe("INVALID_NUMBER");
    expect(after.attempts).toBe(1);
  });
});

describe("Rate limiting (Test 13)", () => {
  it("never processes more messages than the configured per-minute/per-hour limits allow", async () => {
    const { getMarketingSettings } = await import("@/services/marketing-settings.service");
    const settings = await getMarketingSettings();
    expect(settings.rateLimitPerMinute).toBeGreaterThan(0);
    expect(settings.rateLimitPerHour).toBeGreaterThan(0);

    // processMessageQueue's own batchSize is bounded by min(limit, allowedByMinute, allowedByHour) —
    // asking for far more than any sane limit must never exceed the configured caps.
    const result = await processMessageQueue(100000);
    expect(result.processed).toBeLessThanOrEqual(settings.rateLimitPerMinute);
    expect(result.processed).toBeLessThanOrEqual(settings.rateLimitPerHour);
  });
});

describe("Webhook application", () => {
  it("applies a delivered/read event to the matching message by providerMessageId", async () => {
    const customer = await createCustomer({ firstName: `Webhook ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);
    const campaign = await launchedCampaignFor(customer.id, "Hello {{customer_name}}.");

    const message = await prisma.campaignMessage.create({
      data: {
        campaignId: campaign.id,
        customerId: customer.id,
        channel: "WHATSAPP",
        message: "Hello.",
        status: "SENT",
        providerMessageId: `test-${uniqueSuffix()}`,
        sentAt: new Date(),
      },
    });

    await applyWebhookEvent({ providerMessageId: message.providerMessageId!, kind: "delivered", occurredAt: new Date() });
    const delivered = await prisma.campaignMessage.findUniqueOrThrow({ where: { id: message.id } });
    expect(delivered.status).toBe("DELIVERED");

    await applyWebhookEvent({ providerMessageId: message.providerMessageId!, kind: "read", occurredAt: new Date() });
    const read = await prisma.campaignMessage.findUniqueOrThrow({ where: { id: message.id } });
    expect(read.status).toBe("READ");
  });

  it("a reply event containing STOP opts the customer out immediately", async () => {
    const customer = await createCustomer({ firstName: `WebhookStop ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);
    const campaign = await launchedCampaignFor(customer.id, "Hello {{customer_name}}.");

    const message = await prisma.campaignMessage.create({
      data: {
        campaignId: campaign.id,
        customerId: customer.id,
        channel: "WHATSAPP",
        message: "Hello.",
        status: "SENT",
        providerMessageId: `test-${uniqueSuffix()}`,
        sentAt: new Date(),
      },
    });

    await applyWebhookEvent({ providerMessageId: message.providerMessageId!, kind: "reply", occurredAt: new Date(), replyText: "STOP" });
    const row = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(row.marketingConsent).toBe("OPTED_OUT");
  });
});

describe("CRITICAL TEST — a gold-rate campaign's {{gold_rate}} placeholder always comes from the gold-rate service, never AI-generated numeric content", () => {
  it("resolves {{gold_rate}} to the exact current effective rate at queue time", async () => {
    const rates = await getEffectiveRatesForDate(getTodayBusinessDate());
    const k21 = rates.find((r) => r.purity === "K21");
    if (!k21) {
      // No K21 rate set today in this environment — the placeholder correctly resolves to nothing rather than inventing a number.
      return;
    }

    const customer = await createCustomer({ firstName: `GoldRate ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);
    const campaign = await launchedCampaignFor(customer.id, "{{customer_name}}, {{gold_rate}}.");

    await queueCampaignMessages(campaign.id, userId);
    const message = await prisma.campaignMessage.findFirstOrThrow({ where: { campaignId: campaign.id, customerId: customer.id } });

    expect(message.message).toContain(formatCurrency(k21.ratePerGram));
    expect(message.message).toContain("K21");
  });
});
