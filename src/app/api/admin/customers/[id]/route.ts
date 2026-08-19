import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";
import { logAdminActivity } from "@/lib/activity-log";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/admin/customers/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { items: true } },
      wishlist: { include: { product: { include: { images: { take: 1 } } } } },
      messageRecipients: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { campaign: { select: { name: true, channel: true } } },
      },
    },
  });
  if (!customer) return jsonError("Customer not found.", 404);
  return jsonOk({ customer });
}

const updateSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  dob: z.coerce.date().optional(),
  customerType: z.enum(["REGULAR", "VIP"]).optional(),
  marketingConsent: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/customers/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const customer = await prisma.customer.update({
      where: { id },
      data: { ...data, email: data.email === "" ? null : data.email },
    });

    await logAdminActivity({
      adminId: session.adminId,
      action: "CUSTOMER_EDITED",
      description: `Edited customer "${customer.fullName}"`,
      entityType: "Customer",
      entityId: customer.id,
      request,
    });

    return jsonOk({ customer });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("update customer error", err);
    return jsonError("Something went wrong.", 500);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/customers/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return jsonError("Customer not found.", 404);

  await prisma.customer.delete({ where: { id } });

  await logAdminActivity({
    adminId: session.adminId,
    action: "CUSTOMER_DELETED",
    description: `Deleted customer "${customer.fullName}"`,
    entityType: "Customer",
    entityId: id,
    request,
  });

  return jsonOk({ success: true });
}
