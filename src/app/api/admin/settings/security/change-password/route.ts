import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { passwordSchema } from "@/lib/validation";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";
import { logAdminActivity } from "@/lib/activity-log";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
    if (!admin) return jsonError("Admin not found.", 404);

    const valid = await verifyPassword(data.currentPassword, admin.passwordHash);
    if (!valid) {
      return jsonError("Current password is incorrect.", 401, {
        fieldErrors: { currentPassword: "Current password is incorrect." },
      });
    }

    const passwordHash = await hashPassword(data.newPassword);
    await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });

    await logAdminActivity({
      adminId: admin.id,
      action: "PASSWORD_CHANGED",
      description: `${admin.name} changed their password`,
      request,
    });

    return jsonOk({ message: "Password updated successfully." });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("admin change password error", err);
    return jsonError("Something went wrong.", 500);
  }
}
