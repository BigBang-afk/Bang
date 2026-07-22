import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { listCategories } from "@/lib/data/categories";
import { listCollections } from "@/lib/data/collections";
import { getActiveRateMap } from "@/lib/data/gold-rates";
import { createProductAction } from "../actions";

export const metadata: Metadata = { title: "Add Product" };

export default async function NewProductPage() {
  const [categories, collections, activeRates] = await Promise.all([
    listCategories(false),
    listCollections(false),
    getActiveRateMap(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-charcoal">Add Product</h1>
      <ProductForm action={createProductAction} categories={categories} collections={collections} activeRates={activeRates} submitLabel="Create Product" />
    </div>
  );
}
