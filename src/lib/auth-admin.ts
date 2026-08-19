import "server-only";
import { cookies } from "next/headers";
import { signSession, verifySession } from "@/lib/session";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  ADMIN_SESSION_REMEMBER_TTL_SECONDS,
  getAdminSecret,
} from "@/lib/auth-constants";
import type { AdminRole } from "@/generated/prisma/enums";

export type AdminSessionData = {
  adminId: string;
  name: string;
  email: string;
  role: AdminRole;
};

export async function createAdminSessionCookie(
  data: AdminSessionData,
  remember: boolean,
): Promise<{ name: string; value: string; maxAge: number }> {
  const ttl = remember ? ADMIN_SESSION_REMEMBER_TTL_SECONDS : ADMIN_SESSION_TTL_SECONDS;
  const token = await signSession({ ...data }, getAdminSecret(), ttl);
  return { name: ADMIN_COOKIE_NAME, value: token, maxAge: ttl };
}

export async function getAdminSession(): Promise<AdminSessionData | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySession<AdminSessionData & { adminId: string }>(
    token,
    getAdminSecret(),
  );
  if (!payload) return null;
  return {
    adminId: payload.adminId,
    name: payload.name,
    email: payload.email,
    role: payload.role,
  };
}

export { ADMIN_COOKIE_NAME };
