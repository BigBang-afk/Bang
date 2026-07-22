import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import { updateCollectionAction } from "../../actions";
import type { Collection } from "@/types/database";

export const metadata: Metadata = { title: "Edit Collection" };

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const { data: collection } = await db.from("collections").select("*").eq("id", id).maybeSingle<Collection>();
  if (!collection) notFound();

  const boundAction = updateCollectionAction.bind(null, collection.id, collection.image_url);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-charcoal">Edit Collection</h1>
      <TaxonomyForm action={boundAction} initial={collection} label="Collection" />
    </div>
  );
}
