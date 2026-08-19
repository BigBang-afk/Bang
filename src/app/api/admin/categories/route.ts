import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";
import { logAdminActivity } from "@/lib/activity-log";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function GET() {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { parent: true, _count: { select: { products: true, children: true } } },
  });
  return jsonOk({ categories });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = categorySchema.parse(body);
    const slug = data.slug || slugify(data.name);

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return jsonError("A category with this slug already exists.", 409, {
        fieldErrors: { slug: "This slug is already in use." },
      });
    }

    const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        parentId: data.parentId || null,
        imageUrl: data.imageUrl || null,
        sortOrder: data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
        isActive: data.isActive ?? true,
      },
    });

    await logAdminActivity({
      adminId: session.adminId,
      action: "CATEGORY_ADDED",
      description: `Added category "${category.name}"`,
      entityType: "Category",
      entityId: category.id,
      request,
    });

    return jsonOk({ category }, 201);
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("create category error", err);
    return jsonError("Something went wrong.", 500);
  }
}
