import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "bang_session";
const SHORT_SESSION_SECONDS = 60 * 60 * 12; // 12 hours
const LONG_SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is not set or too short. Set a long random string in your .env file."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  sessionVersion: number;
}

export async function createSession(payload: SessionPayload, rememberMe: boolean) {
  const maxAge = rememberMe ? LONG_SESSION_SECONDS : SHORT_SESSION_SECONDS;
  const token = await new SignJWT({
    userId: payload.userId,
    sessionVersion: payload.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readSessionToken(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string" || typeof payload.sessionVersion !== "number") {
      return null;
    }
    return { userId: payload.userId, sessionVersion: payload.sessionVersion };
  } catch {
    return null;
  }
}

/**
 * Returns the current authenticated user (with settings + primary trading account),
 * or null if not authenticated / session invalidated (e.g. after password change).
 */
export async function getCurrentUser() {
  const session = await readSessionToken();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      settings: true,
      tradingAccounts: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  if (!user) return null;
  if (user.sessionVersion !== session.sessionVersion) return null;

  return user;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
