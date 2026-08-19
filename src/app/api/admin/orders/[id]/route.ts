import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";
import { logAdminActivity } from "@/lib/activity-log";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/admin/orders/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true, goldRate: true } } },
  });
  if (!order) return jsonError("Order not found.", 404);
  return jsonOk({ order });
}

const updateSchema = z.object({
  status: z.enum(["NEW", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/orders/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const order = await prisma.order.update({ where: { id }, data, include: { items: true } });

    await logAdminActivity({
      adminId: session.adminId,
      action: "ORDER_UPDATED",
      description: `Updated order ${order.orderNumber}${data.status ? ` → ${data.status}` : ""}`,
      entityType: "Order",
      entityId: order.id,
      request,
    });

    return jsonOk({ order });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("update order error", err);
    return jsonError("Something went wrong.", 500);
  }
}
