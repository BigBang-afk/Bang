import type { Metadata } from "next";
import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import { createCollectionAction } from "../actions";

export const metadata: Metadata = { title: "Add Collection" };

export default function NewCollectionPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-charcoal">Add Collection</h1>
      <TaxonomyForm action={createCollectionAction} label="Collection" />
    </div>
  );
}
