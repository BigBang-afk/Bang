import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth-customer";
import { jsonError, jsonOk, handleZodError } from "@/lib/api-helpers";

const updateSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  marketingConsent: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return jsonError("Please log in to continue.", 401);

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    if (data.email) {
      const existing = await prisma.customer.findFirst({
        where: { email: data.email, NOT: { id: session.customerId } },
      });
      if (existing) {
        return jsonError("This email is already in use.", 409, {
          fieldErrors: { email: "This email is already in use." },
        });
      }
    }

    const customer = await prisma.customer.update({
      where: { id: session.customerId },
      data: {
        fullName: data.fullName,
        email: data.email === "" ? null : data.email,
        marketingConsent: data.marketingConsent,
      },
      select: { id: true, fullName: true, mobile: true, email: true, dob: true, customerType: true },
    });

    return jsonOk({ customer });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("profile update error", err);
    return jsonError("Something went wrong.", 500);
  }
}
