"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { websiteSettingsSchema, businessHourSchema, socialLinkSchema } from "@/lib/validations/settings";
import { uploadPublicImage, ImageValidationError } from "@/lib/supabase/storage";

export interface ActionState {
  error?: string;
  success?: string;
}

export async function updateWebsiteSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("settings.update");

  const parsed = websiteSettingsSchema.safeParse({
    business_name: formData.get("business_name"),
    tagline: formData.get("tagline") || "",
    phone_number: formData.get("phone_number"),
    whatsapp_number: formData.get("whatsapp_number"),
    email: formData.get("email"),
    address_line1: formData.get("address_line1"),
    address_line2: formData.get("address_line2"),
    google_maps_embed_url: formData.get("google_maps_embed_url") || "",
    google_maps_link: formData.get("google_maps_link") || "",
    hero_heading: formData.get("hero_heading"),
    hero_subheading: formData.get("hero_subheading") || "",
    hero_description: formData.get("hero_description") || "",
    hero_cta_1_text: formData.get("hero_cta_1_text"),
    hero_cta_1_url: formData.get("hero_cta_1_url"),
    hero_cta_2_text: formData.get("hero_cta_2_text"),
    hero_cta_2_url: formData.get("hero_cta_2_url"),
    hero_cta_3_text: formData.get("hero_cta_3_text"),
    hero_cta_3_url: formData.get("hero_cta_3_url"),
    gold_rate_disclaimer: formData.get("gold_rate_disclaimer"),
    product_price_disclaimer: formData.get("product_price_disclaimer"),
    custom_order_info: formData.get("custom_order_info") || "",
    footer_about: formData.get("footer_about"),
    seo_default_title: formData.get("seo_default_title"),
    seo_default_description: formData.get("seo_default_description"),
    google_analytics_id: formData.get("google_analytics_id") || "",
    google_search_console_verification: formData.get("google_search_console_verification") || "",
    gold_rate_api_enabled: formData.get("gold_rate_api_enabled") === "on",
    gold_rate_api_url: formData.get("gold_rate_api_url") || "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid settings." };

  const db = createAdminClient();
  const updates: Record<string, unknown> = { ...parsed.data, updated_by: admin.id };

  const logoFile = formData.get("logo_file");
  if (logoFile instanceof File && logoFile.size > 0) {
    try {
      const { url } = await uploadPublicImage(logoFile, "branding");
      updates.logo_url = url;
    } catch (err) {
      return { error: err instanceof ImageValidationError ? err.message : "Failed to upload logo." };
    }
  }

  const faviconFile = formData.get("favicon_file");
  if (faviconFile instanceof File && faviconFile.size > 0) {
    try {
      const { url } = await uploadPublicImage(faviconFile, "branding");
      updates.favicon_url = url;
    } catch (err) {
      return { error: err instanceof ImageValidationError ? err.message : "Failed to upload favicon." };
    }
  }

  const heroFile = formData.get("hero_image_file");
  if (heroFile instanceof File && heroFile.size > 0) {
    try {
      const { url } = await uploadPublicImage(heroFile, "branding");
      updates.hero_image_url = url;
    } catch (err) {
      return { error: err instanceof ImageValidationError ? err.message : "Failed to upload hero image." };
    }
  }

  const { error } = await db.from("website_settings").update(updates).eq("id", true);
  if (error) return { error: `Failed to save: ${error.message}` };

  await recordAdminAction(admin, "settings_updated", "website_settings", null);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");

  return { success: "Settings saved." };
}

export async function updateBusinessHoursAction(formData: FormData) {
  const admin = await requirePermission("settings.update");
  const db = createAdminClient();

  for (let day = 0; day < 7; day++) {
    const parsed = businessHourSchema.safeParse({
      day_of_week: day,
      open_time: formData.get(`open_time_${day}`) || "",
      close_time: formData.get(`close_time_${day}`) || "",
      is_closed: formData.get(`is_closed_${day}`) === "on",
    });
    if (!parsed.success) continue;
    await db.from("business_hours").update({
      open_time: parsed.data.open_time || null,
      close_time: parsed.data.close_time || null,
      is_closed: parsed.data.is_closed,
    }).eq("day_of_week", day);
  }

  await recordAdminAction(admin, "business_hours_updated", "business_hours", null);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}

export async function addSocialLinkAction(formData: FormData) {
  const admin = await requirePermission("settings.update");
  const parsed = socialLinkSchema.safeParse({
    platform: formData.get("platform"),
    url: formData.get("url"),
    is_active: true,
    display_order: 0,
  });
  if (!parsed.success) return;

  const db = createAdminClient();
  await db.from("social_links").insert(parsed.data);
  await recordAdminAction(admin, "social_link_added", "social_links", null, parsed.data.platform);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}

export async function deleteSocialLinkAction(id: string) {
  const admin = await requirePermission("settings.update");
  const db = createAdminClient();
  await db.from("social_links").delete().eq("id", id);
  await recordAdminAction(admin, "social_link_deleted", "social_links", id);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}
