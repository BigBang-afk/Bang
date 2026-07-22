import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Category } from "@/types/database";

export async function listCategories(activeOnly = true): Promise<Category[]> {
  const db = createAdminClient();
  let query = db.from("categories").select("*").order("display_order");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = createAdminClient();
  const { data } = await db.from("categories").select("*").eq("slug", slug).maybeSingle();
  return data as Category | null;
}

export async function getCategoryProductCounts(): Promise<Record<string, number>> {
  const db = createAdminClient();
  const { data } = await db
    .from("products")
    .select("category_id")
    .eq("is_active", true)
    .eq("is_draft", false)
    .is("deleted_at", null);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { category_id: string | null }[]) {
    if (!row.category_id) continue;
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  }
  return counts;
}
