import { z } from "zod";

export const websiteSettingsSchema = z.object({
  business_name: z.string().trim().min(2).max(150),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  phone_number: z.string().trim().min(5).max(30),
  whatsapp_number: z.string().trim().min(5).max(30),
  email: z.string().trim().email(),
  address_line1: z.string().trim().min(2).max(200),
  address_line2: z.string().trim().min(2).max(200),
  google_maps_embed_url: z.string().trim().max(2000).optional().or(z.literal("")),
  google_maps_link: z.string().trim().max(500).optional().or(z.literal("")),
  hero_heading: z.string().trim().min(2).max(150),
  hero_subheading: z.string().trim().max(150).optional().or(z.literal("")),
  hero_description: z.string().trim().max(500).optional().or(z.literal("")),
  hero_cta_1_text: z.string().trim().max(50),
  hero_cta_1_url: z.string().trim().max(300),
  hero_cta_2_text: z.string().trim().max(50),
  hero_cta_2_url: z.string().trim().max(300),
  hero_cta_3_text: z.string().trim().max(50),
  hero_cta_3_url: z.string().trim().max(300),
  gold_rate_disclaimer: z.string().trim().min(5).max(500),
  product_price_disclaimer: z.string().trim().min(5).max(500),
  custom_order_info: z.string().trim().max(500).optional().or(z.literal("")),
  footer_about: z.string().trim().max(500),
  seo_default_title: z.string().trim().min(5).max(70),
  seo_default_description: z.string().trim().min(5).max(160),
  google_analytics_id: z.string().trim().max(50).optional().or(z.literal("")),
  google_search_console_verification: z.string().trim().max(200).optional().or(z.literal("")),
  gold_rate_api_enabled: z.boolean().default(false),
  gold_rate_api_url: z.string().trim().max(500).optional().or(z.literal("")),
});
export type WebsiteSettingsInput = z.infer<typeof websiteSettingsSchema>;

export const pagesContentSchema = z.object({
  about_content: z.string().trim().min(5).max(5000),
  privacy_policy: z.string().trim().min(5).max(8000),
  terms_conditions: z.string().trim().min(5).max(8000),
});
export type PagesContentInput = z.infer<typeof pagesContentSchema>;

export const businessHourSchema = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6),
  open_time: z.string().optional().or(z.literal("")),
  close_time: z.string().optional().or(z.literal("")),
  is_closed: z.boolean().default(false),
});

export const socialLinkSchema = z.object({
  platform: z.string().trim().min(2).max(30),
  url: z.string().trim().url(),
  is_active: z.boolean().default(true),
  display_order: z.coerce.number().int().default(0),
});
