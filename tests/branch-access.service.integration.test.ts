import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createBranch, setUserBranchAccess } from "@/services/branch.service";
import { resolveAuthorizedBranchIds, branchWhereClause, BranchAccessDeniedError } from "@/services/branch-access.service";
import { getBranchCashTotals } from "@/services/bi-cash-analytics.service";
import { formatBranchCode, parseBranchCode } from "@/lib/branch-code";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";

describe("Branch code formatting", () => {
  it("formats and parses ZJB-### codes", () => {
    expect(formatBranchCode(1)).toBe("ZJB-001");
    expect(formatBranchCode(42)).toBe("ZJB-042");
    expect(parseBranchCode("ZJB-001")).toBe(1);
    expect(parseBranchCode("1")).toBe(1);
    expect(parseBranchCode("not-a-code")).toBeNull();
  });
});

describe("Branch access resolution", () => {
  it("OWNER always resolves to ALL, regardless of branchAccessMode", async () => {
    const owner = { id: "irrelevant-for-owner", role: { id: "irrelevant", name: "OWNER" } };
    await expect(resolveAuthorizedBranchIds(owner)).resolves.toBe("ALL");
  });

  it("a user left at the default ALL_BRANCHES mode resolves to ALL", async () => {
    const ownerId = await getSeededOwnerId();
    const passwordHash = await prisma.user.findUniqueOrThrow({ where: { id: ownerId }, select: { passwordHash: true } });
    const role = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    const user = await prisma.user.create({
      data: {
        name: `Test ALL_BRANCHES ${uniqueSuffix()}`,
        email: `all-branches-${uniqueSuffix()}@test.local`,
        passwordHash: passwordHash.passwordHash,
        roleId: role.id,
      },
    });

    await expect(resolveAuthorizedBranchIds({ id: user.id, role: { id: role.id, name: "ADMIN" } })).resolves.toBe("ALL");
  });

  it("a SPECIFIC_BRANCHES user with zero grants resolves to an empty array, not ALL", async () => {
    const ownerId = await getSeededOwnerId();
    const role = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    const user = await prisma.user.create({
      data: {
        name: `Test SPECIFIC ${uniqueSuffix()}`,
        email: `specific-${uniqueSuffix()}@test.local`,
        passwordHash: "irrelevant",
        roleId: role.id,
      },
    });
    await setUserBranchAccess(user.id, "SPECIFIC_BRANCHES", [], ownerId);

    const authorized = await resolveAuthorizedBranchIds({ id: user.id, role: { id: role.id, name: "ADMIN" } });
    expect(authorized).toEqual([]);
  });
});

describe("branchWhereClause", () => {
  it("ALL with no filter returns an unrestricted where fragment", () => {
    expect(branchWhereClause("ALL")).toEqual({});
  });

  it("ALL with an explicit branchId filter scopes to exactly that branch", () => {
    expect(branchWhereClause("ALL", "branch-a")).toEqual({ branchId: "branch-a" });
  });

  it("a specific-branch list with no filter scopes to the authorized set via `in`", () => {
    expect(branchWhereClause(["branch-a", "branch-b"])).toEqual({ branchId: { in: ["branch-a", "branch-b"] } });
  });

  it("throws BranchAccessDeniedError when the requested branch is not in the authorized set", () => {
    expect(() => branchWhereClause(["branch-a"], "branch-b")).toThrow(BranchAccessDeniedError);
  });

  it("an authorized branch id within the set is allowed", () => {
    expect(branchWhereClause(["branch-a", "branch-b"], "branch-a")).toEqual({ branchId: "branch-a" });
  });
});

describe("CRITICAL TEST — a user authorized for Branch A only can never see Branch B's financial data", () => {
  it("getBranchCashTotals excludes Branch B's cash entirely for a Branch-A-only user, and rejects an explicit request for Branch B", async () => {
    const ownerId = await getSeededOwnerId();
    const branchA = await createBranch({ name: `Branch A ${uniqueSuffix()}` }, ownerId);
    const branchB = await createBranch({ name: `Branch B ${uniqueSuffix()}` }, ownerId);

    // Real cash transactions posted directly to each branch, bypassing any
    // creation-flow UI (Phase 8 doesn't wire branch selection into POS/cash
    // forms yet) — this is the most direct way to prove the BI query layer
    // itself enforces isolation, independent of how the row got branchId set.
    await prisma.cashTransaction.create({
      data: { transactionType: "SALE_PAYMENT", direction: "IN", amount: 500000, paymentMethod: "CASH", branchId: branchA.id, createdById: ownerId },
    });
    await prisma.cashTransaction.create({
      data: { transactionType: "SALE_PAYMENT", direction: "IN", amount: 900000, paymentMethod: "CASH", branchId: branchB.id, createdById: ownerId },
    });

    const managerRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    const branchAUser = await prisma.user.create({
      data: {
        name: `Branch A Manager ${uniqueSuffix()}`,
        email: `branch-a-mgr-${uniqueSuffix()}@test.local`,
        passwordHash: "irrelevant",
        roleId: managerRole.id,
      },
    });
    await setUserBranchAccess(branchAUser.id, "SPECIFIC_BRANCHES", [branchA.id], ownerId);
    const scopedUser = { id: branchAUser.id, role: { id: managerRole.id, name: "ADMIN" as const } };

    // Unscoped query (no explicit branchId) — must include Branch A's cash and MUST NOT include Branch B's.
    const totals = await getBranchCashTotals(scopedUser, "this_year");
    const branchIds = totals.map((t) => t.branchId);
    expect(branchIds).toContain(branchA.id);
    expect(branchIds).not.toContain(branchB.id);

    const branchATotal = totals.find((t) => t.branchId === branchA.id);
    expect(Number(branchATotal?.totalIn)).toBeGreaterThanOrEqual(500000);

    // Explicit attempt to query Branch B's data — must be denied, never silently return empty or (worse) real data.
    await expect(getBranchCashTotals(scopedUser, "this_year", branchB.id)).rejects.toThrow("You are not authorized for this branch's data.");

    // The OWNER, by contrast, can see both branches without restriction.
    const ownerUser = { id: ownerId, role: { id: "irrelevant", name: "OWNER" as const } };
    const ownerTotals = await getBranchCashTotals(ownerUser, "this_year");
    expect(ownerTotals.map((t) => t.branchId)).toEqual(expect.arrayContaining([branchA.id, branchB.id]));
  });
});
