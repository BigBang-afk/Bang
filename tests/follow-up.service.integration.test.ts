import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createCustomer } from "@/services/customer.service";
import { createInventoryItem } from "@/services/inventory-item.service";
import { completeSale } from "@/services/sale-transaction.service";
import {
  getCustomersToContact,
  createFollowUpTask,
  createFollowUpTasksFromRecommendations,
  updateFollowUpTaskStatus,
  EmptyFollowUpReasonError,
  FollowUpTaskNotFoundError,
} from "@/services/follow-up.service";
import { getSeededOwnerId, getTestCategoryId, uniqueSuffix } from "./helpers/db-fixtures";
import type { CreateInventoryItemInput } from "@/types/inventory";

let userId: string;
let categoryId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
  categoryId = await getTestCategoryId();
});

function uniquePhone(): string {
  const digits = (Date.now() % 1e8).toString().padStart(8, "0");
  return `+923${digits}${Math.floor(Math.random() * 10)}`;
}

function buildItemInput(overrides: Partial<CreateInventoryItemInput> = {}): CreateInventoryItemInput {
  return {
    productName: `FollowUp Item ${uniqueSuffix()}`,
    categoryId,
    purity: "K22",
    netWeight: 5,
    goldRate: 40000,
    wastageType: "PERCENTAGE",
    wastagePercent: 5,
    sellingPrice: 250000,
    ...overrides,
  };
}

describe("Follow-up generation (Test 16)", () => {
  it("ranks a lapsed repeat customer HIGH with a factual reason built from real recency/purchase-count data", async () => {
    const customer = await createCustomer({ firstName: `Lapsed ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item1 = await createInventoryItem(buildItemInput(), userId);
    const item2 = await createInventoryItem(buildItemInput(), userId);

    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    await completeSale(
      { customerId: customer.id, items: [{ inventoryItemId: item1.id }], payments: [{ method: "CASH", amount: 250000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    await completeSale(
      { customerId: customer.id, items: [{ inventoryItemId: item2.id }], payments: [{ method: "CASH", amount: 250000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    // Backdate both sales directly — completeSale always stamps "now".
    await prisma.sale.updateMany({ where: { customerId: customer.id }, data: { saleDate: oldDate } });

    const recommendations = await getCustomersToContact(2000);
    const match = recommendations.find((r) => r.customerId === customer.id);
    expect(match).toBeDefined();
    expect(match?.priority).toBe("HIGH");
    expect(match?.reason).toContain("previously made 2 purchases");
    expect(match?.reason).toMatch(/\d+ days/);
  });

  it("creates follow-up tasks from selected recommendations with source AI_RECOMMENDATION", async () => {
    const customer = await createCustomer({ firstName: `AiTask ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const item = await createInventoryItem(buildItemInput(), userId);
    await completeSale(
      { customerId: customer.id, items: [{ inventoryItemId: item.id }], payments: [{ method: "CASH", amount: 250000 }] },
      { id: userId, role: { name: "OWNER" } },
    );
    const oldDate = new Date(Date.now() - 150 * 24 * 60 * 60 * 1000);
    await prisma.sale.updateMany({ where: { customerId: customer.id }, data: { saleDate: oldDate } });

    const created = await createFollowUpTasksFromRecommendations([customer.id], userId);
    expect(created).toBe(1);

    const task = await prisma.followUpTask.findFirstOrThrow({ where: { customerId: customer.id } });
    expect(task.source).toBe("AI_RECOMMENDATION");
    expect(task.reason.length).toBeGreaterThan(0);

    const log = await prisma.auditLog.findFirst({ where: { entity: "FollowUpTask", entityId: task.id, action: "AI_RECOMMENDATION_GENERATED" } });
    expect(log).not.toBeNull();
  });
});

describe("Follow-up tasks (manual)", () => {
  it("rejects an empty reason", async () => {
    const customer = await createCustomer({ firstName: `EmptyReason ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await expect(createFollowUpTask({ customerId: customer.id, reason: "" }, userId)).rejects.toThrow(EmptyFollowUpReasonError);
  });

  it("moves OPEN -> IN_PROGRESS -> COMPLETED and stamps completedAt, auditing completion", async () => {
    const customer = await createCustomer({ firstName: `Manual ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const task = await createFollowUpTask({ customerId: customer.id, reason: "Manual check-in", priority: "MEDIUM" }, userId);

    await updateFollowUpTaskStatus(task.id, "IN_PROGRESS", userId);
    let row = await prisma.followUpTask.findUniqueOrThrow({ where: { id: task.id } });
    expect(row.status).toBe("IN_PROGRESS");
    expect(row.completedAt).toBeNull();

    await updateFollowUpTaskStatus(task.id, "COMPLETED", userId);
    row = await prisma.followUpTask.findUniqueOrThrow({ where: { id: task.id } });
    expect(row.status).toBe("COMPLETED");
    expect(row.completedAt).not.toBeNull();

    const log = await prisma.auditLog.findFirst({ where: { entity: "FollowUpTask", entityId: task.id, action: "FOLLOW_UP_TASK_COMPLETED" } });
    expect(log).not.toBeNull();
  });

  it("throws for an unknown task id", async () => {
    await expect(updateFollowUpTaskStatus("00000000-0000-0000-0000-000000000000", "COMPLETED", userId)).rejects.toThrow(FollowUpTaskNotFoundError);
  });
});
