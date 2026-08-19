import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, requireAdmin } from "@/lib/api-helpers";
import { saveUploadedImage, UploadValidationError } from "@/lib/storage";
import { logAdminActivity } from "@/lib/activity-log";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/products/[id]/images">,
) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return jsonError("Product not found.", 404);

  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return jsonError("No files were uploaded.", 400);

  const existingCount = await prisma.productImage.count({ where: { productId: id } });

  try {
    const created = [];
    for (let i = 0; i < files.length; i++) {
      const { url } = await saveUploadedImage(files[i], `products/${id}`);
      const image = await prisma.productImage.create({
        data: {
          productId: id,
          url,
          altText: product.name,
          sortOrder: existingCount + i,
          isPrimary: existingCount === 0 && i === 0,
        },
      });
      created.push(image);
    }

    await logAdminActivity({
      adminId: session.adminId,
      action: "PRODUCT_IMAGES_UPLOADED",
      description: `Uploaded ${created.length} image(s) for "${product.name}"`,
      entityType: "Product",
      entityId: id,
      request,
    });

    return jsonOk({ images: created }, 201);
  } catch (err) {
    if (err instanceof UploadValidationError) return jsonError(err.message, 422);
    console.error("product image upload error", err);
    return jsonError("Upload failed.", 500);
  }
}

const reorderSchema = z.array(
  z.object({ id: z.string(), sortOrder: z.number().int(), isPrimary: z.boolean().optional() }),
);

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/products/[id]/images">,
) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid reorder payload.", 422);

  await prisma.$transaction(
    parsed.data.map((item) =>
      prisma.productImage.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder, ...(item.isPrimary !== undefined ? { isPrimary: item.isPrimary } : {}) },
      }),
    ),
  );

  if (parsed.data.some((item) => item.isPrimary)) {
    const primaryId = parsed.data.find((item) => item.isPrimary)!.id;
    await prisma.productImage.updateMany({
      where: { productId: id, NOT: { id: primaryId } },
      data: { isPrimary: false },
    });
  }

  const images = await prisma.productImage.findMany({ where: { productId: id }, orderBy: { sortOrder: "asc" } });
  return jsonOk({ images });
}
