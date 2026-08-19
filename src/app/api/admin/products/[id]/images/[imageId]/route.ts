import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, requireAdmin } from "@/lib/api-helpers";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/products/[id]/images/[imageId]">,
) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id, imageId } = await ctx.params;
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId: id } });
  if (!image) return jsonError("Image not found.", 404);

  await prisma.productImage.delete({ where: { id: imageId } });

  if (image.isPrimary) {
    const next = await prisma.productImage.findFirst({ where: { productId: id }, orderBy: { sortOrder: "asc" } });
    if (next) await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
  }

  return jsonOk({ success: true });
}
