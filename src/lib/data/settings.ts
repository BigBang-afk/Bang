import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BusinessHour, SocialLink, WebsiteSettings } from "@/types/database";

export async function getWebsiteSettings(): Promise<WebsiteSettings> {
  const db = createAdminClient();
  const { data, error } = await db.from("website_settings").select("*").eq("id", true).single();
  if (error) throw error;
  return data as WebsiteSettings;
}

export async function getBusinessHours(): Promise<BusinessHour[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("business_hours").select("*").order("day_of_week");
  if (error) throw error;
  return (data ?? []) as BusinessHour[];
}

export async function getSocialLinks(activeOnly = true): Promise<SocialLink[]> {
  const db = createAdminClient();
  let query = db.from("social_links").select("*").order("display_order");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SocialLink[];
}
