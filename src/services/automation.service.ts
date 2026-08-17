import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { getUpcomingBirthdays, getUpcomingAnniversaries } from "@/services/customer-analytics.service";
import { getCustomersToContact } from "@/services/follow-up.service";
import { createFollowUpTask } from "@/services/follow-up.service";
import { createCampaignDraft } from "@/services/campaign.service";
import type { AutomationAction, AutomationStatus, AutomationTrigger } from "@/generated/prisma/client";

/**
 * The Automation Rule engine — see AUTOMATION-RULES.md. IF (trigger +
 * conditions) THEN (action). The action set is deliberately restricted to
 * CREATE_FOLLOW_UP_TASK and CREATE_CAMPAIGN_DRAFT — a rule can never send
 * a message by itself, even when ACTIVE. Running a rule is always either a
 * manual "Run now" click or (in a future phase, once a job scheduler
 * exists) a real cron; this phase does not ship a background scheduler,
 * so `nextRunAt` is informational only — see AUTOMATION-RULES.md "Known
 * limitation".
 */

export type AutomationConditions = { inactiveDays?: number; daysAhead?: number };

export type CreateAutomationRuleInput = {
  name: string;
  trigger: AutomationTrigger;
  conditions: AutomationConditions;
  action: AutomationAction;
};

export async function createAutomationRule(input: CreateAutomationRuleInput, userId: string) {
  const rule = await prisma.automationRule.create({
    data: {
      name: input.name,
      trigger: input.trigger,
      conditions: input.conditions as never,
      action: input.action,
      status: "DRAFT",
      createdById: userId,
    },
  });
  return rule;
}

export class AutomationRuleNotFoundError extends Error {
  constructor(message = "Automation rule not found.") {
    super(message);
    this.name = "AutomationRuleNotFoundError";
  }
}

export class InvalidAutomationStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAutomationStatusTransitionError";
  }
}

/** Activating a rule requires the same marketing:automation_manage permission as everything else here — the spec's "unless the user explicitly enables the automation" line. */
export async function setAutomationRuleStatus(ruleId: string, status: AutomationStatus, userId: string) {
  const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });
  if (!rule) throw new AutomationRuleNotFoundError();

  const updated = await prisma.automationRule.update({
    where: { id: ruleId },
    data: { status, approvedById: status === "ACTIVE" ? userId : rule.approvedById },
  });

  await writeAuditLog({
    userId,
    action: status === "ACTIVE" ? "AUTOMATION_ENABLED" : "AUTOMATION_DISABLED",
    entity: "AutomationRule",
    entityId: ruleId,
    metadata: { status },
  });

  return updated;
}

export async function listAutomationRules() {
  return prisma.automationRule.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } }, approvedBy: { select: { id: true, name: true } } },
  });
}

export type RunAutomationResult = { followUpTasksCreated: number; campaignDraftsCreated: number };

async function runCustomerInactiveTrigger(conditions: AutomationConditions, action: AutomationAction, userId: string): Promise<RunAutomationResult> {
  const inactiveDays = conditions.inactiveDays ?? 90;
  const candidates = (await getCustomersToContact(500)).filter(
    (c) => c.daysSinceLastPurchase !== null && c.daysSinceLastPurchase >= inactiveDays,
  );

  if (action === "CREATE_FOLLOW_UP_TASK") {
    let created = 0;
    for (const candidate of candidates) {
      const existing = await prisma.followUpTask.findFirst({ where: { customerId: candidate.customerId, status: { in: ["OPEN", "IN_PROGRESS"] } } });
      if (existing) continue;
      await createFollowUpTask({ customerId: candidate.customerId, reason: candidate.reason, priority: candidate.priority, source: "AUTOMATION" }, userId);
      created += 1;
    }
    return { followUpTasksCreated: created, campaignDraftsCreated: 0 };
  }

  if (action === "CREATE_CAMPAIGN_DRAFT" && candidates.length > 0) {
    await createCampaignDraft(
      {
        name: `Automated: inactive ${inactiveDays}+ days (${new Date().toISOString().slice(0, 10)})`,
        objective: "REACTIVATION",
        campaignType: "INACTIVE_CUSTOMER",
        audienceFilters: { lastPurchaseOlderThanDays: inactiveDays, requireOptedIn: true },
        messageTemplate: "Hello {{customer_name}}, we've missed you at {{shop_name}} — take a look at what's new.",
      },
      userId,
    );
    return { followUpTasksCreated: 0, campaignDraftsCreated: 1 };
  }

  return { followUpTasksCreated: 0, campaignDraftsCreated: 0 };
}

async function runUpcomingDateTrigger(
  trigger: "BIRTHDAY_UPCOMING" | "ANNIVERSARY_UPCOMING",
  conditions: AutomationConditions,
  action: AutomationAction,
  userId: string,
): Promise<RunAutomationResult> {
  const daysAhead = conditions.daysAhead ?? 7;
  const upcoming = trigger === "BIRTHDAY_UPCOMING" ? await getUpcomingBirthdays(daysAhead) : await getUpcomingAnniversaries(daysAhead);
  const label = trigger === "BIRTHDAY_UPCOMING" ? "birthday" : "anniversary";

  if (action === "CREATE_FOLLOW_UP_TASK") {
    let created = 0;
    for (const entry of upcoming) {
      const existing = await prisma.followUpTask.findFirst({ where: { customerId: entry.id, status: { in: ["OPEN", "IN_PROGRESS"] } } });
      if (existing) continue;
      await createFollowUpTask(
        { customerId: entry.id, reason: `Customer's ${label} is in ${entry.daysAway} day(s).`, priority: "LOW", source: "AUTOMATION" },
        userId,
      );
      created += 1;
    }
    return { followUpTasksCreated: created, campaignDraftsCreated: 0 };
  }

  // A CREATE_CAMPAIGN_DRAFT birthday/anniversary automation only ever targets
  // opted-in customers — the audience filter enforces this at launch time
  // regardless of what this draft's filters say, but it's set explicitly
  // here too so the draft is honest about its own intent.
  if (action === "CREATE_CAMPAIGN_DRAFT" && upcoming.length > 0) {
    await createCampaignDraft(
      {
        name: `Automated: upcoming ${label}s (${new Date().toISOString().slice(0, 10)})`,
        objective: "ENGAGEMENT",
        campaignType: trigger === "BIRTHDAY_UPCOMING" ? "BIRTHDAY" : "ANNIVERSARY",
        audienceFilters: { requireOptedIn: true },
        messageTemplate: `Hello {{customer_name}}, {{shop_name}} wishes you a wonderful ${label}!`,
      },
      userId,
    );
    return { followUpTasksCreated: 0, campaignDraftsCreated: 1 };
  }

  return { followUpTasksCreated: 0, campaignDraftsCreated: 0 };
}

/** Evaluates and runs one ACTIVE rule. Never runs a DRAFT/PAUSED/DISABLED rule. */
export async function runAutomationRule(ruleId: string, userId: string): Promise<RunAutomationResult> {
  const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });
  if (!rule) throw new AutomationRuleNotFoundError();
  if (rule.status !== "ACTIVE") throw new InvalidAutomationStatusTransitionError("Only an ACTIVE automation rule can be run.");

  const conditions = (rule.conditions as AutomationConditions) ?? {};
  let result: RunAutomationResult;

  if (rule.trigger === "CUSTOMER_INACTIVE") {
    result = await runCustomerInactiveTrigger(conditions, rule.action, userId);
  } else {
    result = await runUpcomingDateTrigger(rule.trigger, conditions, rule.action, userId);
  }

  await prisma.automationRule.update({
    where: { id: ruleId },
    data: { lastRunAt: new Date(), nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });

  return result;
}
