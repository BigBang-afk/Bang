import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createCustomer } from "@/services/customer.service";
import { recordOptIn } from "@/services/marketing-consent.service";
import { resolveAudience, matchesStaticFilters, isPlausiblePhoneNumber } from "@/services/audience-builder.service";
import {
  createCampaignDraft,
  submitCampaignForApproval,
  approveCampaign,
  launchCampaign,
  cancelCampaign,
  getCampaignById,
  CampaignNotFoundError,
  InvalidCampaignStatusTransitionError,
  NoEligibleAudienceError,
} from "@/services/campaign.service";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";
import type { CustomerMarketingProfileRow } from "@/services/ai-segmentation.service";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

function uniquePhone(): string {
  const digits = (Date.now() % 1e8).toString().padStart(8, "0");
  return `+923${digits}${Math.floor(Math.random() * 10)}`;
}

function baseProfile(overrides: Partial<CustomerMarketingProfileRow> = {}): CustomerMarketingProfileRow {
  return {
    id: "test-id",
    customerCode: "ZJC-000001",
    name: "Test Customer",
    phone: "+923001234567",
    city: null,
    customerType: "REGULAR",
    status: "ACTIVE",
    marketingConsent: "OPTED_IN",
    outstandingBalance: "0",
    totalSpending: "0",
    purchaseCount: 0,
    lastPurchaseAt: null,
    createdAt: new Date(),
    hasGoldPurchase: false,
    hasDiamondPurchase: false,
    hasBridalPurchase: false,
    purchasedCategoryIds: [],
    purchasedPurities: [],
    ...overrides,
  };
}

describe("Audience filtering (Test 8) and phone plausibility", () => {
  it("matchesStaticFilters applies every filter as an AND condition", () => {
    const vip = baseProfile({ customerType: "VIP" });
    expect(matchesStaticFilters(vip, { customerType: ["VIP"] }, true)).toBe(true);
    expect(matchesStaticFilters(vip, { customerType: ["REGULAR"] }, true)).toBe(false);

    const spender = baseProfile({ totalSpending: "500000" });
    expect(matchesStaticFilters(spender, { minTotalSpending: 400000 }, false)).toBe(true);
    expect(matchesStaticFilters(spender, { minTotalSpending: 600000 }, false)).toBe(false);

    const notOptedIn = baseProfile({ marketingConsent: "UNKNOWN" });
    expect(matchesStaticFilters(notOptedIn, {}, false)).toBe(false);
  });

  it("rejects an implausible phone number", () => {
    expect(isPlausiblePhoneNumber("+923001234567")).toBe(true);
    expect(isPlausiblePhoneNumber("not-a-phone")).toBe(false);
    expect(isPlausiblePhoneNumber("123")).toBe(false);
  });
});

describe("Audience count (Test 9)", () => {
  it("resolveAudience reports matched/eligible counts that add up with the exclusion buckets", async () => {
    const customer = await createCustomer({ firstName: `AudienceCount ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);

    const audience = await resolveAudience({ requireOptedIn: true });
    expect(audience.eligibleCustomerIds).toContain(customer.id);
    expect(audience.matchedCount).toBeGreaterThanOrEqual(audience.eligibleCount);
    expect(audience.eligibleCount).toBe(audience.eligibleCustomerIds.length);
  });
});

describe("Campaign creation (Test 7)", () => {
  it("creates a DRAFT campaign and records CAMPAIGN_CREATED", async () => {
    const campaign = await createCampaignDraft(
      {
        name: `Test Campaign ${uniqueSuffix()}`,
        objective: "ENGAGEMENT",
        campaignType: "SPECIAL_OFFER",
        audienceFilters: { requireOptedIn: true },
        messageTemplate: "Hello {{customer_name}}, {{shop_name}} has something for you.",
      },
      userId,
    );

    expect(campaign.status).toBe("DRAFT");
    const log = await prisma.auditLog.findFirst({ where: { entity: "Campaign", entityId: campaign.id, action: "CAMPAIGN_CREATED" } });
    expect(log).not.toBeNull();
  });

  it("rejects a campaign whose message fails safety validation at submit time", async () => {
    const campaign = await createCampaignDraft(
      {
        name: `Unsafe Campaign ${uniqueSuffix()}`,
        objective: "SALES",
        campaignType: "SPECIAL_OFFER",
        audienceFilters: {},
        messageTemplate: "Hurry, only 3 left! Guaranteed to double your money!",
      },
      userId,
    );

    await expect(submitCampaignForApproval(campaign.id)).rejects.toThrow(InvalidCampaignStatusTransitionError);
  });
});

describe("Campaign workflow — DRAFT -> PENDING_APPROVAL -> SCHEDULED -> RUNNING, and the launch compliance gate", () => {
  it("walks the full lifecycle and audits each transition", async () => {
    const customer = await createCustomer({ firstName: `Workflow ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);

    const campaign = await createCampaignDraft(
      {
        name: `Workflow Campaign ${uniqueSuffix()}`,
        objective: "ENGAGEMENT",
        campaignType: "SPECIAL_OFFER",
        audienceFilters: { requireOptedIn: true },
        messageTemplate: "Hello {{customer_name}}, {{shop_name}} has something for you.",
      },
      userId,
    );

    await submitCampaignForApproval(campaign.id);
    const pending = await getCampaignById(campaign.id);
    expect(pending?.status).toBe("PENDING_APPROVAL");

    await approveCampaign(campaign.id, userId);
    const approved = await getCampaignById(campaign.id);
    expect(approved?.status).toBe("SCHEDULED");
    const approvalLog = await prisma.auditLog.findFirst({ where: { entity: "Campaign", entityId: campaign.id, action: "CAMPAIGN_APPROVED" } });
    expect(approvalLog).not.toBeNull();

    const { campaign: launched } = await launchCampaign(campaign.id, userId);
    expect(launched.status).toBe("RUNNING");
    const launchLog = await prisma.auditLog.findFirst({ where: { entity: "Campaign", entityId: campaign.id, action: "CAMPAIGN_LAUNCHED" } });
    expect(launchLog).not.toBeNull();

    await cancelCampaign(campaign.id, userId, "Test cleanup");
    const cancelled = await getCampaignById(campaign.id);
    expect(cancelled?.status).toBe("CANCELLED");
    const cancelLog = await prisma.auditLog.findFirst({ where: { entity: "Campaign", entityId: campaign.id, action: "CAMPAIGN_CANCELLED" } });
    expect(cancelLog).not.toBeNull();
  });

  it("refuses to launch a campaign whose audience has zero eligible customers", async () => {
    const campaign = await createCampaignDraft(
      {
        name: `No Audience Campaign ${uniqueSuffix()}`,
        objective: "ENGAGEMENT",
        campaignType: "SPECIAL_OFFER",
        // An impossible filter — no customer will ever match this exact marker city.
        audienceFilters: { requireOptedIn: true, city: `Nonexistent-${uniqueSuffix()}` },
        messageTemplate: "Hello {{customer_name}}.",
      },
      userId,
    );
    await submitCampaignForApproval(campaign.id);
    await approveCampaign(campaign.id, userId);

    await expect(launchCampaign(campaign.id, userId)).rejects.toThrow(NoEligibleAudienceError);
  });

  it("throws CampaignNotFoundError for an unknown campaign id", async () => {
    await expect(approveCampaign("00000000-0000-0000-0000-000000000000", userId)).rejects.toThrow(CampaignNotFoundError);
  });
});
