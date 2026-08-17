"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { writeAuditLog } from "@/services/audit.service";
import { getCurrentUser } from "@/lib/auth/dal";

export type LoginState = {
  error?: string;
} | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      isActive: true,
      role: { select: { name: true } },
    },
  });

  const genericError = "Incorrect email or password.";

  if (!user || !user.isActive) {
    await writeAuditLog({
      userId: null,
      action: "LOGIN_FAILED",
      entity: "User",
      metadata: { email },
    });
    return { error: genericError };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    await writeAuditLog({
      userId: user.id,
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user.id,
    });
    return { error: genericError };
  }

  await createSession(user.id, user.role.name);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await writeAuditLog({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
  });

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  await deleteSession();
  if (user) {
    await writeAuditLog({
      userId: user.id,
      action: "LOGOUT",
      entity: "User",
      entityId: user.id,
    });
  }
  redirect("/login");
}
