import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Add Product</h1>
      <ProductForm />
    </div>
  );
}
