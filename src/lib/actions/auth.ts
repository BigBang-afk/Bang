"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createSession, destroySession, getCurrentUser } from "@/lib/session";
import { loginSchema, registerSchema, changePasswordSchema, setPinSchema } from "@/lib/validation";
import { redirect } from "next/navigation";

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function registerAction(input: {
  email: string;
  traderName: string;
  password: string;
}): Promise<ActionResult> {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    return { error: "An account already exists. This is a single-user personal app — please log in." };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      traderName: parsed.data.traderName,
      passwordHash,
      settings: { create: {} },
    },
  });

  await createSession({ userId: user.id, sessionVersion: user.sessionVersion }, false);
  redirect("/setup");
}

async function isRateLimited(email: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const recentFailures = await prisma.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: windowStart } },
  });
  return recentFailures >= MAX_ATTEMPTS;
}

export async function loginAction(input: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, password, rememberMe } = parsed.data;

  if (await isRateLimited(email)) {
    return { error: `Too many failed attempts. Please wait ${WINDOW_MINUTES} minutes and try again.` };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  await prisma.loginAttempt.create({
    data: { email, success: valid, userId: user?.id },
  });

  if (!user || !valid) {
    return { error: "Invalid email or password." };
  }

  await createSession({ userId: user.id, sessionVersion: user.sessionVersion }, rememberMe ?? false);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, sessionVersion: { increment: 1 } },
  });

  await createSession({ userId: updated.id, sessionVersion: updated.sessionVersion }, false);
  return {};
}

export async function setPinAction(input: { pin: string }): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = setPinSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid PIN" };
  }

  const pinHash = await hashPassword(parsed.data.pin);
  await prisma.user.update({ where: { id: user.id }, data: { pinHash } });
  return {};
}
