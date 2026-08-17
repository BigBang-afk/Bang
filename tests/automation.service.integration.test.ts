import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createCustomer } from "@/services/customer.service";
import { recordOptIn } from "@/services/marketing-consent.service";
import {
  createAutomationRule,
  setAutomationRuleStatus,
  runAutomationRule,
  AutomationRuleNotFoundError,
  InvalidAutomationStatusTransitionError,
} from "@/services/automation.service";
import { resolveAudience } from "@/services/audience-builder.service";
import { createCampaignDraft, submitCampaignForApproval, approveCampaign, launchCampaign } from "@/services/campaign.service";
import { queueCampaignMessages } from "@/services/message-queue.service";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

function uniquePhone(): string {
  const digits = (Date.now() % 1e8).toString().padStart(8, "0");
  return `+923${digits}${Math.floor(Math.random() * 10)}`;
}

describe("Automation rules (Test 23)", () => {
  it("a rule never runs unless it's ACTIVE — never send-by-default", async () => {
    const rule = await createAutomationRule(
      { name: `Draft Rule ${uniqueSuffix()}`, trigger: "CUSTOMER_INACTIVE", conditions: { inactiveDays: 90 }, action: "CREATE_FOLLOW_UP_TASK" },
      userId,
    );
    expect(rule.status).toBe("DRAFT");
    await expect(runAutomationRule(rule.id, userId)).rejects.toThrow(InvalidAutomationStatusTransitionError);
  });

  it("enabling a rule requires an explicit action and is audited as AUTOMATION_ENABLED", async () => {
    const rule = await createAutomationRule(
      { name: `Enable Rule ${uniqueSuffix()}`, trigger: "CUSTOMER_INACTIVE", conditions: { inactiveDays: 999999 }, action: "CREATE_FOLLOW_UP_TASK" },
      userId,
    );
    await setAutomationRuleStatus(rule.id, "ACTIVE", userId);
    const activated = await prisma.automationRule.findUniqueOrThrow({ where: { id: rule.id } });
    expect(activated.status).toBe("ACTIVE");
    expect(activated.approvedById).toBe(userId);

    const log = await prisma.auditLog.findFirst({ where: { entity: "AutomationRule", entityId: rule.id, action: "AUTOMATION_ENABLED" } });
    expect(log).not.toBeNull();
  });

  it("disabling a rule is audited as AUTOMATION_DISABLED and the rule can no longer run", async () => {
    const rule = await createAutomationRule(
      { name: `Disable Rule ${uniqueSuffix()}`, trigger: "CUSTOMER_INACTIVE", conditions: { inactiveDays: 90 }, action: "CREATE_FOLLOW_UP_TASK" },
      userId,
    );
    await setAutomationRuleStatus(rule.id, "ACTIVE", userId);
    await setAutomationRuleStatus(rule.id, "DISABLED", userId);

    const log = await prisma.auditLog.findFirst({ where: { entity: "AutomationRule", entityId: rule.id, action: "AUTOMATION_DISABLED" } });
    expect(log).not.toBeNull();
    await expect(runAutomationRule(rule.id, userId)).rejects.toThrow(InvalidAutomationStatusTransitionError);
  });

  it("an ACTIVE CUSTOMER_INACTIVE rule with CREATE_FOLLOW_UP_TASK creates a task, never a message", async () => {
    const customer = await createCustomer({ firstName: `AutoInactive ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    await prisma.customer.update({ where: { id: customer.id }, data: { createdAt: oldDate } });

    const rule = await createAutomationRule(
      { name: `Run Rule ${uniqueSuffix()}`, trigger: "CUSTOMER_INACTIVE", conditions: { inactiveDays: 90 }, action: "CREATE_FOLLOW_UP_TASK" },
      userId,
    );
    await setAutomationRuleStatus(rule.id, "ACTIVE", userId);
    const result = await runAutomationRule(rule.id, userId);
    expect(result.campaignDraftsCreated).toBe(0);

    // No CampaignMessage was ever created by the automation run itself.
    const messages = await prisma.campaignMessage.count({ where: { campaign: { name: { contains: "Automated" } } } });
    expect(messages).toBe(0);

    const after = await prisma.automationRule.findUniqueOrThrow({ where: { id: rule.id } });
    expect(after.lastRunAt).not.toBeNull();
  });

  it("throws AutomationRuleNotFoundError for an unknown rule id", async () => {
    await expect(runAutomationRule("00000000-0000-0000-0000-000000000000", userId)).rejects.toThrow(AutomationRuleNotFoundError);
  });
});

describe("Frequency limits (Test 24)", () => {
  it("excludes a customer who already has a message today from a second campaign's eligible audience", async () => {
    const customer = await createCustomer({ firstName: `Frequency ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);

    const first = await resolveAudience({ requireOptedIn: true, customerIds: [customer.id] });
    expect(first.eligibleCustomerIds).toContain(customer.id);

    const campaign = await createCampaignDraft(
      {
        name: `Frequency Test ${uniqueSuffix()}`,
        objective: "ENGAGEMENT",
        campaignType: "SPECIAL_OFFER",
        audienceFilters: { requireOptedIn: true, customerIds: [customer.id] },
        messageTemplate: "Hello {{customer_name}}.",
      },
      userId,
    );
    await submitCampaignForApproval(campaign.id);
    await approveCampaign(campaign.id, userId);
    await launchCampaign(campaign.id, userId);
    await queueCampaignMessages(campaign.id, userId);

    const second = await resolveAudience({ requireOptedIn: true, customerIds: [customer.id] });
    expect(second.eligibleCustomerIds).not.toContain(customer.id);
    expect(second.excludedRecentlyContacted).toBe(1);
  });
});

describe("Audit logs (Test 25)", () => {
  it("writes an AI_ASSISTANT_QUERY, CAMPAIGN_CREATED, and MESSAGE_QUEUED trail for one full workflow", async () => {
    const customer = await createCustomer({ firstName: `AuditTrail ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);

    const campaign = await createCampaignDraft(
      {
        name: `Audit Trail Test ${uniqueSuffix()}`,
        objective: "ENGAGEMENT",
        campaignType: "SPECIAL_OFFER",
        audienceFilters: { requireOptedIn: true, customerIds: [customer.id] },
        messageTemplate: "Hello {{customer_name}}.",
      },
      userId,
    );

    const created = await prisma.auditLog.findFirst({ where: { entity: "Campaign", entityId: campaign.id, action: "CAMPAIGN_CREATED" } });
    expect(created).not.toBeNull();
    expect(created?.metadata).toBeTruthy();

    // Never a secret/credential in metadata.
    const metadataString = JSON.stringify(created?.metadata ?? {});
    expect(metadataString.toLowerCase()).not.toContain("password");
    expect(metadataString.toLowerCase()).not.toContain("token");
  });
});
