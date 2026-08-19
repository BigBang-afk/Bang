import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { messageTemplateSchema } from "@/lib/validation";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/messages/templates/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const data = messageTemplateSchema.partial().parse(body);
    const template = await prisma.messageTemplate.update({ where: { id }, data });
    return jsonOk({ template });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("update template error", err);
    return jsonError("Something went wrong.", 500);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/admin/messages/templates/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  await prisma.messageTemplate.delete({ where: { id } });
  return jsonOk({ success: true });
}
