import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";
import { logAdminActivity } from "@/lib/activity-log";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/categories/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const data = categorySchema.partial().parse(body);

    if (data.slug) {
      const existing = await prisma.category.findFirst({ where: { slug: data.slug, NOT: { id } } });
      if (existing) {
        return jsonError("A category with this slug already exists.", 409, {
          fieldErrors: { slug: "This slug is already in use." },
        });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...data,
        description: data.description === "" ? null : data.description,
        parentId: data.parentId ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
      },
    });

    await logAdminActivity({
      adminId: session.adminId,
      action: "CATEGORY_EDITED",
      description: `Edited category "${category.name}"`,
      entityType: "Category",
      entityId: category.id,
      request,
    });

    return jsonOk({ category });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("update category error", err);
    return jsonError("Something went wrong.", 500);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/categories/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!category) return jsonError("Category not found.", 404);

  if (category._count.products > 0) {
    return jsonError("This category still has products assigned. Move or delete them first.", 409);
  }

  await prisma.category.delete({ where: { id } });

  await logAdminActivity({
    adminId: session.adminId,
    action: "CATEGORY_DELETED",
    description: `Deleted category "${category.name}"`,
    entityType: "Category",
    entityId: id,
    request,
  });

  return jsonOk({ success: true });
}
