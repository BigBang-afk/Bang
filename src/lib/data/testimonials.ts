import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Testimonial } from "@/types/database";

export async function listTestimonials(approvedOnly = true): Promise<Testimonial[]> {
  const db = createAdminClient();
  let query = db.from("testimonials").select("*").order("display_order").order("created_at", { ascending: false });
  if (approvedOnly) query = query.eq("is_approved", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Testimonial[];
}
