import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { getCustomerMarketingProfiles } from "@/services/ai-segmentation.service";
import { getSegmentationConfig } from "@/services/customer-analytics.service";
import type { FollowUpPriority, FollowUpStatus } from "@/generated/prisma/client";

/**
 * "Customers to Contact" + FollowUpTask management — see
 * AI-MARKETING.md "AI follow-up system". Every ranked recommendation
 * carries a factual `reason` built only from real recency/purchase-count
 * data; nothing here ever sends a message itself — a follow-up is always
 * a task for a human.
 */

export type ContactPriority = "LOW" | "MEDIUM" | "HIGH";
const PRIORITY_RANK: Record<ContactPriority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export type ContactRecommendation = {
  customerId: string;
  name: string;
  phone: string;
  reason: string;
  priority: ContactPriority;
  daysSinceLastPurchase: number | null;
  purchaseCount: number;
};

/**
 * Ranks customers worth a human follow-up call/message using only real
 * recency + purchase-history facts (never a campaign-response prediction
 * dressed up as certainty). HIGH: lapsed repeat customers (2+ past
 * purchases, 120+ days quiet). MEDIUM: past the configured inactivity
 * threshold. Customers with zero purchases ever are surfaced separately,
 * since "hasn't bought again" doesn't apply to them.
 */
export async function getCustomersToContact(limit = 50): Promise<ContactRecommendation[]> {
  const [profiles, config] = await Promise.all([getCustomerMarketingProfiles(), getSegmentationConfig()]);
  const now = Date.now();

  const candidates: ContactRecommendation[] = [];
  for (const profile of profiles) {
    const daysSince = profile.lastPurchaseAt
      ? Math.floor((now - profile.lastPurchaseAt.getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((now - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    if (profile.purchaseCount === 0) {
      if (daysSince >= config.inactivityDays) {
        candidates.push({
          customerId: profile.id,
          name: profile.name,
          phone: profile.phone,
          reason: `Customer has never completed a purchase since joining ${daysSince} days ago.`,
          priority: "MEDIUM",
          daysSinceLastPurchase: null,
          purchaseCount: 0,
        });
      }
      continue;
    }

    if (daysSince < config.inactivityDays) continue;

    const priority: ContactPriority = daysSince >= 120 && profile.purchaseCount >= 2 ? "HIGH" : "MEDIUM";
    candidates.push({
      customerId: profile.id,
      name: profile.name,
      phone: profile.phone,
      reason: `Customer has not purchased in ${daysSince} days and previously made ${profile.purchaseCount} purchase${profile.purchaseCount === 1 ? "" : "s"}.`,
      priority,
      daysSinceLastPurchase: daysSince,
      purchaseCount: profile.purchaseCount,
    });
  }

  return candidates
    .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.purchaseCount - a.purchaseCount)
    .slice(0, limit);
}

export type CreateFollowUpTaskInput = {
  customerId: string;
  reason: string;
  priority?: FollowUpPriority;
  dueDate?: Date;
  assignedToId?: string;
  notes?: string;
  source?: "MANUAL" | "AI_RECOMMENDATION" | "AUTOMATION";
};

export class EmptyFollowUpReasonError extends Error {
  constructor(message = "A reason is required for a follow-up task.") {
    super(message);
    this.name = "EmptyFollowUpReasonError";
  }
}

export async function createFollowUpTask(input: CreateFollowUpTaskInput, userId: string) {
  if (!input.reason.trim()) throw new EmptyFollowUpReasonError();

  const task = await prisma.followUpTask.create({
    data: {
      customerId: input.customerId,
      reason: input.reason,
      priority: input.priority ?? "MEDIUM",
      dueDate: input.dueDate,
      assignedToId: input.assignedToId,
      notes: input.notes,
      source: input.source ?? "MANUAL",
      createdById: userId,
    },
  });

  await writeAuditLog({
    userId,
    action: input.source === "AI_RECOMMENDATION" ? "AI_RECOMMENDATION_GENERATED" : "FOLLOW_UP_TASK_CREATED",
    entity: "FollowUpTask",
    entityId: task.id,
    metadata: { customerId: input.customerId, priority: task.priority, source: task.source },
  });

  return task;
}

/** Turns a set of AI-ranked recommendations directly into tasks — still never sends anything, just creates work items for a human. */
export async function createFollowUpTasksFromRecommendations(customerIds: string[], userId: string): Promise<number> {
  const recommendations = await getCustomersToContact(500);
  const byId = new Map(recommendations.map((r) => [r.customerId, r]));

  let created = 0;
  for (const customerId of customerIds) {
    const rec = byId.get(customerId);
    if (!rec) continue;
    await createFollowUpTask({ customerId, reason: rec.reason, priority: rec.priority, source: "AI_RECOMMENDATION" }, userId);
    created += 1;
  }
  return created;
}

export class FollowUpTaskNotFoundError extends Error {
  constructor(message = "Follow-up task not found.") {
    super(message);
    this.name = "FollowUpTaskNotFoundError";
  }
}

export async function updateFollowUpTaskStatus(taskId: string, status: FollowUpStatus, userId: string) {
  const task = await prisma.followUpTask.findUnique({ where: { id: taskId } });
  if (!task) throw new FollowUpTaskNotFoundError();

  const updated = await prisma.followUpTask.update({
    where: { id: taskId },
    data: { status, completedAt: status === "COMPLETED" ? new Date() : task.completedAt },
  });

  if (status === "COMPLETED") {
    await writeAuditLog({ userId, action: "FOLLOW_UP_TASK_COMPLETED", entity: "FollowUpTask", entityId: taskId });
  }
  return updated;
}

export type FollowUpTaskListFilters = { status?: FollowUpStatus; assignedToId?: string; customerId?: string };

export async function listFollowUpTasks(filters: FollowUpTaskListFilters = {}) {
  return prisma.followUpTask.findMany({
    where: { status: filters.status, assignedToId: filters.assignedToId, customerId: filters.customerId },
    include: { customer: { select: { id: true, name: true, phone: true } }, assignedTo: { select: { id: true, name: true } } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 300,
  });
}
