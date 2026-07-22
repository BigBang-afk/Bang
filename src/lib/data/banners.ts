import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Banner } from "@/types/database";

export async function listActiveBanners(): Promise<Banner[]> {
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await db
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as Banner[];
}
