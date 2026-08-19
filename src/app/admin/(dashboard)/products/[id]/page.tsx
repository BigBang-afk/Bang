import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Edit Product</h1>
      <ProductForm
        productId={product.id}
        initial={{
          name: product.name,
          sku: product.sku,
          categoryId: product.categoryId,
          description: product.description ?? "",
          purity: product.purity,
          grossWeight: product.grossWeight.toString(),
          netGoldWeight: product.netGoldWeight.toString(),
          stoneWeight: product.stoneWeight.toString(),
          makingCharges: product.makingCharges.toString(),
          stoneCharges: product.stoneCharges.toString(),
          otherCharges: product.otherCharges.toString(),
          discount: product.discount.toString(),
          taxPercent: product.taxPercent.toString(),
          status: product.status,
          stockStatus: product.stockStatus,
          isFeatured: product.isFeatured,
          isNewArrival: product.isNewArrival,
          isBestseller: product.isBestseller,
        }}
      />
    </div>
  );
}
