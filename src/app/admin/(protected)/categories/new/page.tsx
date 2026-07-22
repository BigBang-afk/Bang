import type { Metadata } from "next";
import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import { createCategoryAction } from "../actions";

export const metadata: Metadata = { title: "Add Category" };

export default function NewCategoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-charcoal">Add Category</h1>
      <TaxonomyForm action={createCategoryAction} label="Category" />
    </div>
  );
}
