import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { customerRegisterSchema } from "@/lib/validation";
import { jsonError, jsonOk, handleZodError } from "@/lib/api-helpers";
import { createCustomerSessionCookie } from "@/lib/auth-customer";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`register:${ip}`, 10, 60 * 60);
  if (!limited.allowed) {
    return jsonError("Too many attempts. Please try again later.", 429);
  }

  try {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    if (settings && settings.registrationEnabled === false) {
      return jsonError("New customer registration is currently disabled.", 403);
    }

    const body = await request.json();
    const data = customerRegisterSchema.parse(body);

    const existingMobile = await prisma.customer.findUnique({ where: { mobile: data.mobile } });
    if (existingMobile) {
      return jsonError("An account with this mobile number already exists.", 409, {
        fieldErrors: { mobile: "This mobile number is already registered." },
      });
    }

    if (data.email) {
      const existingEmail = await prisma.customer.findUnique({ where: { email: data.email } });
      if (existingEmail) {
        return jsonError("An account with this email already exists.", 409, {
          fieldErrors: { email: "This email is already registered." },
        });
      }
    }

    const passwordHash = await hashPassword(data.password);
    const customer = await prisma.customer.create({
      data: {
        fullName: data.fullName,
        mobile: data.mobile,
        dob: data.dob,
        email: data.email || null,
        passwordHash,
        marketingConsent: data.marketingConsent ?? true,
      },
    });

    const cookie = await createCustomerSessionCookie({
      customerId: customer.id,
      fullName: customer.fullName,
      mobile: customer.mobile,
    });

    const res = jsonOk({
      customer: { id: customer.id, fullName: customer.fullName, mobile: customer.mobile },
    }, 201);
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
    console.error("register error", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
