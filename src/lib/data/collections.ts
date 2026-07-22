import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Collection } from "@/types/database";

export async function listCollections(activeOnly = true): Promise<Collection[]> {
  const db = createAdminClient();
  let query = db.from("collections").select("*").order("display_order");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Collection[];
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const db = createAdminClient();
  const { data } = await db.from("collections").select("*").eq("slug", slug).maybeSingle();
  return data as Collection | null;
}

export async function getCollectionProductCounts(): Promise<Record<string, number>> {
  const db = createAdminClient();
  const { data } = await db.from("product_collections").select("collection_id, products!inner(is_active, is_draft, deleted_at)");

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as unknown as {
    collection_id: string;
    products: { is_active: boolean; is_draft: boolean; deleted_at: string | null };
  }[]) {
    const p = row.products;
    if (!p || !p.is_active || p.is_draft || p.deleted_at) continue;
    counts[row.collection_id] = (counts[row.collection_id] ?? 0) + 1;
  }
  return counts;
}
