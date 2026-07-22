import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import { updateCategoryAction } from "../../actions";
import type { Category } from "@/types/database";

export const metadata: Metadata = { title: "Edit Category" };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const { data: category } = await db.from("categories").select("*").eq("id", id).maybeSingle<Category>();
  if (!category) notFound();

  const boundAction = updateCategoryAction.bind(null, category.id, category.image_url);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-charcoal">Edit Category</h1>
      <TaxonomyForm action={boundAction} initial={category} label="Category" />
    </div>
  );
}
