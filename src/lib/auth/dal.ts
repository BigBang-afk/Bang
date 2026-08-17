import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { decryptSession, getSessionCookie } from "@/lib/auth/session";
import {
  AuthorizationError,
  OWNER_ROLE_NAME,
  type PermissionKey,
} from "@/lib/auth/permissions";

/**
 * Data Access Layer for authentication/authorization. Every data request,
 * Server Action, and Route Handler that needs the current user should go
 * through these functions rather than reading the session cookie directly.
 * Each is memoized per request with React `cache`.
 */

export const verifySession = cache(async () => {
  const token = await getSessionCookie();
  const session = await decryptSession(token ?? undefined);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      role: { select: { id: true, name: true } },
    },
  });

  if (!user || !user.isActive) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Redirects to /login when there is no valid, active-user session. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

const getRolePermissionKeys = cache(async (roleId: string): Promise<Set<string>> => {
  const rows = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permission: { select: { key: true } } },
  });
  return new Set(rows.map((row) => row.permission.key));
});

export async function userHasPermission(
  user: Pick<CurrentUser, "role">,
  key: PermissionKey,
): Promise<boolean> {
  if (user.role.name === OWNER_ROLE_NAME) return true;
  const keys = await getRolePermissionKeys(user.role.id);
  return keys.has(key);
}

/** Throws AuthorizationError for Server Actions/Route Handlers to catch and report. */
export async function assertPermission(
  user: Pick<CurrentUser, "role">,
  key: PermissionKey,
): Promise<void> {
  const allowed = await userHasPermission(user, key);
  if (!allowed) throw new AuthorizationError();
}

/** For Server Components/pages: redirects to the dashboard if the permission is missing. */
export async function requirePermission(key: PermissionKey): Promise<CurrentUser> {
  const user = await requireUser();
  const allowed = await userHasPermission(user, key);
  if (!allowed) redirect("/dashboard?error=forbidden");
  return user;
}
