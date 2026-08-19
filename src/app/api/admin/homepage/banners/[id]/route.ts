import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";

const schema = z.object({
  imageUrl: z.string().min(1).optional(),
  heading: z.string().trim().max(150).optional(),
  description: z.string().trim().max(400).optional(),
  buttonText: z.string().trim().max(60).optional(),
  buttonUrl: z.string().trim().max(200).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/homepage/banners/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const banner = await prisma.banner.update({ where: { id }, data });
    return jsonOk({ banner });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("update banner error", err);
    return jsonError("Something went wrong.", 500);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/admin/homepage/banners/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  await prisma.banner.delete({ where: { id } });
  return jsonOk({ success: true });
}
