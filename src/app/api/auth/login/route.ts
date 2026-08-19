import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { customerLoginSchema } from "@/lib/validation";
import { jsonError, jsonOk, handleZodError } from "@/lib/api-helpers";
import { createCustomerSessionCookie } from "@/lib/auth-customer";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`login:${ip}`, 15, 15 * 60);
  if (!limited.allowed) {
    return jsonError("Too many login attempts. Please try again later.", 429);
  }

  try {
    const body = await request.json();
    const data = customerLoginSchema.parse(body);
    const identifier = data.identifier.trim().toLowerCase();

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ mobile: data.identifier.trim() }, { email: identifier }],
      },
    });

    if (!customer || !customer.isActive) {
      return jsonError("Invalid credentials.", 401);
    }

    const valid = await verifyPassword(data.password, customer.passwordHash);
    if (!valid) {
      return jsonError("Invalid credentials.", 401);
    }

    const cookie = await createCustomerSessionCookie({
      customerId: customer.id,
      fullName: customer.fullName,
      mobile: customer.mobile,
    });

    const res = jsonOk({
      customer: { id: customer.id, fullName: customer.fullName, mobile: customer.mobile },
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
    console.error("login error", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
