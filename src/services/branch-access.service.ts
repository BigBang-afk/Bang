import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { OWNER_ROLE_NAME } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/dal";

/**
 * Server-side branch authorization — see BRANCH-ARCHITECTURE.md "Branch
 * access" / "Data security". A frontend-supplied branchId is NEVER trusted
 * on its own; every branch-scoped BI query resolves the CURRENT user's
 * authorized branch set here first, then either narrows its query to it or
 * rejects an out-of-scope request. OWNER always sees every branch; every
 * other user is ALL_BRANCHES (today's single-branch default, preserving
 * existing behavior for every seeded account) or SPECIFIC_BRANCHES (an
 * explicit allow-list via UserBranch).
 */

/** "ALL" = every branch (OWNER, or a user explicitly granted ALL_BRANCHES). Otherwise the exact authorized branch id list — possibly empty. */
export type AuthorizedBranches = "ALL" | string[];

const getUserBranchGrant = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { branchAccessMode: true, branches: { select: { branchId: true } } },
  });
});

export async function resolveAuthorizedBranchIds(user: Pick<CurrentUser, "id" | "role">): Promise<AuthorizedBranches> {
  if (user.role.name === OWNER_ROLE_NAME) return "ALL";
  const grant = await getUserBranchGrant(user.id);
  if (!grant || grant.branchAccessMode === "ALL_BRANCHES") return "ALL";
  return grant.branches.map((b) => b.branchId);
}

export class BranchAccessDeniedError extends Error {
  constructor(message = "You are not authorized for this branch's data.") {
    super(message);
    this.name = "BranchAccessDeniedError";
  }
}

/**
 * Turns an authorized-branch set plus an optional requested branchId into a
 * Prisma `where` fragment — or throws if the specific requested branch
 * isn't authorized. Passing no `branchIdFilter` with a non-"ALL" authorized
 * set narrows to exactly the caller's authorized branches (never silently
 * broadens to everything). An authorized set of `[]` (SPECIFIC_BRANCHES
 * with nothing granted yet) always resolves to an impossible filter, so
 * the underlying query returns zero rows rather than every branch's data.
 */
export function branchWhereClause(
  authorized: AuthorizedBranches,
  branchIdFilter?: string,
): { branchId?: string | { in: string[] } } {
  if (branchIdFilter) {
    if (authorized !== "ALL" && !authorized.includes(branchIdFilter)) {
      throw new BranchAccessDeniedError();
    }
    return { branchId: branchIdFilter };
  }
  if (authorized === "ALL") return {};
  // No branch id has ever legitimately been the empty string — using it as
  // an impossible sentinel keeps this a plain equality filter (fast, index
  // friendly) instead of `{ in: [] }`, which some query planners handle
  // less predictably.
  if (authorized.length === 0) return { branchId: "00000000-0000-0000-0000-000000000000" };
  return { branchId: { in: authorized } };
}

/** Convenience wrapper: resolve + build the where-fragment for the current user in one call. */
export async function resolveBranchFilter(
  user: Pick<CurrentUser, "id" | "role">,
  branchIdFilter?: string,
): Promise<{ branchId?: string | { in: string[] } }> {
  const authorized = await resolveAuthorizedBranchIds(user);
  return branchWhereClause(authorized, branchIdFilter);
}
