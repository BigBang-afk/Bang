import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(500).optional(),
  addCustomerIds: z.array(z.string()).optional(),
  removeCustomerIds: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/customer-groups/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    if (data.removeCustomerIds?.length) {
      await prisma.customerGroupMember.deleteMany({
        where: { groupId: id, customerId: { in: data.removeCustomerIds } },
      });
    }
    if (data.addCustomerIds?.length) {
      await prisma.customerGroupMember.createMany({
        data: data.addCustomerIds.map((customerId) => ({ groupId: id, customerId })),
        skipDuplicates: true,
      });
    }

    const group = await prisma.customerGroup.update({
      where: { id },
      data: { name: data.name, description: data.description },
      include: { _count: { select: { members: true } } },
    });

    return jsonOk({ group });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("update customer group error", err);
    return jsonError("Something went wrong.", 500);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/admin/customer-groups/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  await prisma.customerGroup.delete({ where: { id } });
  return jsonOk({ success: true });
}
