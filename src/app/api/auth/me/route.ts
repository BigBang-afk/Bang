import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth-customer";
import { jsonOk, jsonError } from "@/lib/api-helpers";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return jsonOk({ customer: null });

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: {
      id: true,
      fullName: true,
      mobile: true,
      email: true,
      dob: true,
      customerType: true,
      createdAt: true,
    },
  });

  if (!customer) return jsonError("Session expired.", 401);
  return jsonOk({ customer });
}
