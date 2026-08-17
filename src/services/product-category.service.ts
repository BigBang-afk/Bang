import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";

export type ProductCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  itemCount: number;
};

export async function listCategories(): Promise<ProductCategoryRow[]> {
  const categories = await prisma.productCategory.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      isSystem: true,
      _count: { select: { products: true } },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    isSystem: category.isSystem,
    itemCount: category._count.products,
  }));
}

export async function createCategory(
  input: { name: string; description?: string },
  createdById: string,
): Promise<ProductCategoryRow> {
  const category = await prisma.productCategory.create({
    data: { name: input.name, description: input.description },
  });

  await writeAuditLog({
    userId: createdById,
    action: "CATEGORY_CREATED",
    entity: "ProductCategory",
    entityId: category.id,
    metadata: { name: category.name },
  });

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    isSystem: category.isSystem,
    itemCount: 0,
  };
}
