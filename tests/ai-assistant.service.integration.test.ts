import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { askAiAssistant, resolveIntent } from "@/services/ai-assistant.service";
import { getOrCreateRoleWithNoPermissions, getSeededOwnerId } from "./helpers/db-fixtures";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/dal";

let ownerId: string;

beforeAll(async () => {
  ownerId = await getSeededOwnerId();
});

/** The AuditLog.userId column is a real FK, so every test user here must be a genuine row — the seeded owner's id is reused as the "acting user" identity, while `role` (a plain, unpersisted object) is what actually drives every permission check below, independent of the real owner's own real grants. */
function userWithRole(role: { id: string; name: string }): CurrentUser {
  return { id: ownerId, name: "Test User", email: "test@example.com", isActive: true, role };
}

describe("AI permission filtering (Test 19)", () => {
  it("resolveIntent routes known questions to the matching tool deterministically", () => {
    expect(resolveIntent("What are today's sales?")).toBe("getSalesSummary");
    expect(resolveIntent("Which customers are inactive?")).toBe("getCustomerSegments");
    expect(resolveIntent("How much gold is currently with karigars?")).toBe("getGoldPosition");
    expect(resolveIntent("Which campaign performed best?")).toBe("getCampaignPerformance");
    expect(resolveIntent("asdkjaslkdj random text")).toBeNull();
  });

  it("a role granted the matching permission gets real data, not a denial", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.INVENTORY_VIEW } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = await userWithRole(role);
    const answer = await askAiAssistant("What inventory is available?", user);
    expect(answer.toolUsed).toBe("getInventoryAvailability");
    expect(answer.denied).toBe(false);
    expect(answer.data).toBeDefined();
  });

  it("a role WITHOUT the matching permission is denied, never silently downgraded to a partial answer", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const user = await userWithRole(role);

    const answer = await askAiAssistant("Which customers are inactive?", user);
    expect(answer.toolUsed).toBe("getCustomerSegments");
    expect(answer.denied).toBe(true);
    expect(answer.data).toBeUndefined();
  });

  it("OWNER always resolves to real data regardless of RolePermission grants", async () => {
    const user = await userWithRole({ id: "irrelevant-for-owner", name: "OWNER" });
    const answer = await askAiAssistant("What are today's sales?", user);
    expect(answer.denied).toBe(false);
    expect(answer.data).toBeDefined();
  });

  it("every assistant query is audited, including denied ones, without leaking the denied data itself", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const user = await userWithRole(role);
    await askAiAssistant("What are the payables?", user);

    const log = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: "AI_ASSISTANT_QUERY", entity: "AiAssistant" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    const metadata = log?.metadata as { question: string; toolUsed: string | null; denied: boolean };
    expect(metadata.denied).toBe(true);
    expect(metadata.toolUsed).toBe("getPayables");
  });
});

describe("CRITICAL TEST — AI asks for unauthorized financial information", () => {
  it("returns ACCESS DENIED rather than any receivables/payables/sales data", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const user = await userWithRole(role);

    const receivablesAnswer = await askAiAssistant("Show customers who owe us money.", user);
    expect(receivablesAnswer.denied).toBe(true);
    expect(receivablesAnswer.answer).toContain("ACCESS DENIED");
    expect(receivablesAnswer.data).toBeUndefined();

    const salesAnswer = await askAiAssistant("How much did we sell this month?", user);
    expect(salesAnswer.denied).toBe(true);
    expect(salesAnswer.answer).toContain("ACCESS DENIED");
    expect(salesAnswer.data).toBeUndefined();
  });
});
