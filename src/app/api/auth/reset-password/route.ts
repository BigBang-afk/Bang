import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validation";
import { jsonError, jsonOk, handleZodError } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.customerPasswordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return jsonError("This reset link is invalid or has expired.", 400);
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: resetToken.customerId },
        data: { passwordHash },
      }),
      prisma.customerPasswordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return jsonOk({ message: "Your password has been reset. You can now log in." });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("reset-password error", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
