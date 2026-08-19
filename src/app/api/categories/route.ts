import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api-helpers";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      _count: { select: { products: { where: { status: "PUBLISHED" } } } },
    },
  });
  return jsonOk({ categories });
}
