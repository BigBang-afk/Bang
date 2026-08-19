import { NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation";
import { jsonOk, handleZodError } from "@/lib/api-helpers";
import { getMessagingProvider, renderTemplate } from "@/lib/messaging";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";

const RESET_TTL_MINUTES = 30;

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`forgot-password:${ip}`, 10, 60 * 60);
  if (!limited.allowed) {
    return jsonOk({
      message: "Too many requests. Please try again later.",
    });
  }

  try {
    const body = await request.json();
    const { identifier } = forgotPasswordSchema.parse(body);
    const normalized = identifier.trim().toLowerCase();

    const customer = await prisma.customer.findFirst({
      where: { OR: [{ mobile: identifier.trim() }, { email: normalized }] },
    });

    // Always return a generic success response to avoid account enumeration.
    const genericMessage =
      "If an account with that mobile number or email exists, password reset instructions have been sent.";

    if (!customer) return jsonOk({ message: genericMessage });

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

    await prisma.customerPasswordResetToken.create({
      data: { customerId: customer.id, tokenHash, expiresAt },
    });

    const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${rawToken}`;
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });

    const provider = getMessagingProvider();
    const smsBody = renderTemplate(
      "Hi {customer_name}, reset your {store_name} password here: {phone}",
      {
        customer_name: customer.fullName,
        store_name: settings?.businessName ?? "Zarghoon Jewellers",
        phone: resetLink,
        date: new Date().toLocaleDateString(),
      },
    );
    // Best-effort send; failure (e.g. no provider configured) never blocks
    // the response or reveals account existence to the caller.
    provider.send(customer.mobile, smsBody, "SMS").catch(() => {});

    const devPayload =
      process.env.NODE_ENV !== "production" ? { devResetLink: resetLink } : {};

    return jsonOk({ message: genericMessage, ...devPayload });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("forgot-password error", err);
    return jsonOk({
      message: "If an account with that mobile number or email exists, password reset instructions have been sent.",
    });
  }
}
