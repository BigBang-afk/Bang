import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { adminLoginSchema } from "@/lib/validation";
import { jsonError, jsonOk, handleZodError } from "@/lib/api-helpers";
import { createAdminSessionCookie } from "@/lib/auth-admin";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { logAdminActivity } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`admin-login:${ip}`, 10, 15 * 60);
  if (!limited.allowed) {
    return jsonError("Too many login attempts. Please try again later.", 429);
  }

  try {
    const body = await request.json();
    const data = adminLoginSchema.parse(body);

    const admin = await prisma.admin.findUnique({ where: { email: data.email } });
    if (!admin || !admin.isActive) {
      return jsonError("Invalid credentials.", 401);
    }

    const valid = await verifyPassword(data.password, admin.passwordHash);
    if (!valid) {
      return jsonError("Invalid credentials.", 401);
    }

    const cookie = await createAdminSessionCookie(
      { adminId: admin.id, name: admin.name, email: admin.email, role: admin.role },
      data.remember,
    );

    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    await logAdminActivity({
      adminId: admin.id,
      action: "LOGIN",
      description: `${admin.name} logged in`,
      request,
    });

    const res = jsonOk({
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
    res.cookies.set(cookie.name, cookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: cookie.maxAge,
    });
    return res;
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("admin login error", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
