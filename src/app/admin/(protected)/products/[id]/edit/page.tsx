import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImageGallery } from "@/components/admin/product-image-gallery";
import { listCategories } from "@/lib/data/categories";
import { listCollections } from "@/lib/data/collections";
import { getActiveRateMap } from "@/lib/data/gold-rates";
import { getProductById } from "@/lib/data/products";
import { updateProductAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, collections, activeRates] = await Promise.all([
    getProductById(id),
    listCategories(false),
    listCollections(false),
    getActiveRateMap(),
  ]);

  if (!product) notFound();

  const boundAction = updateProductAction.bind(null, product.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-charcoal">Edit Product</h1>
        <p className="text-sm text-charcoal/60">{product.product_code} · {product.name}</p>
      </div>

      <div className="rounded-sm border border-charcoal/10 bg-white p-5">
        <h2 className="mb-4 font-serif text-lg">Product Images</h2>
        <ProductImageGallery productId={product.id} images={product.images} />
      </div>

      <ProductForm action={boundAction} categories={categories} collections={collections} activeRates={activeRates} initial={product} submitLabel="Save Changes" />
    </div>
  );
}
