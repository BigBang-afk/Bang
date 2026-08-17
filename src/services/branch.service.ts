import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { formatBranchCode } from "@/lib/branch-code";
import { Prisma } from "@/generated/prisma/client";
import type { BranchAccessMode, BranchStatus } from "@/generated/prisma/client";

/**
 * Branch CRUD and user branch-access assignment — the multi-branch
 * foundation. See BRANCH-ARCHITECTURE.md. Creating/editing a branch never
 * touches any existing transactional row — wiring a branch picker into
 * POS/Add Stock/purchases/expenses is explicitly out of scope for this
 * phase (see BRANCH-ARCHITECTURE.md "What Phase 8 does not wire up").
 */

export type BranchRow = {
  id: string;
  branchCode: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  status: BranchStatus;
  createdAt: Date;
  updatedAt: Date;
};

const BRANCH_SELECT = {
  id: true,
  branchCode: true,
  name: true,
  address: true,
  city: true,
  phone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BranchSelect;

function toBranchRow(row: {
  id: string;
  branchCode: number;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  status: BranchStatus;
  createdAt: Date;
  updatedAt: Date;
}): BranchRow {
  return { ...row, branchCode: formatBranchCode(row.branchCode) };
}

export type CreateBranchInput = {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
};

export async function createBranch(input: CreateBranchInput, userId: string): Promise<BranchRow> {
  const branch = await prisma.branch.create({
    data: { name: input.name, address: input.address, city: input.city, phone: input.phone, createdById: userId },
    select: BRANCH_SELECT,
  });
  await writeAuditLog({ userId, action: "BRANCH_CREATED", entity: "Branch", entityId: branch.id, metadata: { name: branch.name } });
  return toBranchRow(branch);
}

export class BranchNotFoundError extends Error {
  constructor(message = "Branch could not be found.") {
    super(message);
    this.name = "BranchNotFoundError";
  }
}

export type UpdateBranchInput = Partial<CreateBranchInput> & { status?: BranchStatus };

export async function updateBranch(branchId: string, input: UpdateBranchInput, userId: string): Promise<BranchRow> {
  const existing = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!existing) throw new BranchNotFoundError();

  const branch = await prisma.branch.update({
    where: { id: branchId },
    data: { name: input.name, address: input.address, city: input.city, phone: input.phone, status: input.status },
    select: BRANCH_SELECT,
  });
  await writeAuditLog({
    userId,
    action: "BRANCH_SETTINGS_CHANGED",
    entity: "Branch",
    entityId: branch.id,
    metadata: { name: branch.name },
  });
  return toBranchRow(branch);
}

export async function listBranches(includeInactive = true): Promise<BranchRow[]> {
  const rows = await prisma.branch.findMany({
    where: includeInactive ? {} : { status: "ACTIVE" },
    select: BRANCH_SELECT,
    orderBy: { branchCode: "asc" },
  });
  return rows.map(toBranchRow);
}

export async function getBranchById(branchId: string): Promise<BranchRow | null> {
  const row = await prisma.branch.findUnique({ where: { id: branchId }, select: BRANCH_SELECT });
  return row ? toBranchRow(row) : null;
}

export type UserBranchAccessRow = {
  userId: string;
  userName: string;
  branchAccessMode: BranchAccessMode;
  authorizedBranchIds: string[];
};

/** Sets a user's branch access mode and (only when SPECIFIC_BRANCHES) the exact authorized branch list — replaces any prior grant list atomically. */
export async function setUserBranchAccess(
  targetUserId: string,
  mode: BranchAccessMode,
  branchIds: string[],
  actingUserId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: targetUserId }, data: { branchAccessMode: mode } });
    await tx.userBranch.deleteMany({ where: { userId: targetUserId } });
    if (mode === "SPECIFIC_BRANCHES" && branchIds.length > 0) {
      await tx.userBranch.createMany({ data: branchIds.map((branchId) => ({ userId: targetUserId, branchId })) });
    }
  });
  await writeAuditLog({
    userId: actingUserId,
    action: "BRANCH_SETTINGS_CHANGED",
    entity: "User",
    entityId: targetUserId,
    metadata: { branchAccessMode: mode, branchIds },
  });
}

export async function listUsersForBranchAssignment(): Promise<UserBranchAccessRow[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, branchAccessMode: true, branches: { select: { branchId: true } } },
    orderBy: { name: "asc" },
  });
  return users.map((user) => ({
    userId: user.id,
    userName: user.name,
    branchAccessMode: user.branchAccessMode,
    authorizedBranchIds: user.branches.map((b) => b.branchId),
  }));
}

export async function getUserBranchAccess(targetUserId: string): Promise<UserBranchAccessRow | null> {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, branchAccessMode: true, branches: { select: { branchId: true } } },
  });
  if (!user) return null;
  return {
    userId: user.id,
    userName: user.name,
    branchAccessMode: user.branchAccessMode,
    authorizedBranchIds: user.branches.map((b) => b.branchId),
  };
}
