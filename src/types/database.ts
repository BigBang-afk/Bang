import type {
  AdminRole,
  AvailabilityStatus,
  ContactMethod,
  CustomOrderStatus,
  DiscountType,
  GoldPurity,
  InquiryStatus,
  PricingMethod,
} from "@/lib/constants";

export type Gender = "women" | "men" | "kids" | "unisex";

export interface AdminProfile {
  id: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  phone: string | null;
  avatar_url: string | null;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebsiteSettings {
  id: true;
  business_name: string;
  tagline: string;
  phone_number: string;
  whatsapp_number: string;
  email: string;
  address_line1: string;
  address_line2: string;
  google_maps_embed_url: string | null;
  google_maps_link: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  hero_heading: string;
  hero_subheading: string;
  hero_description: string;
  hero_image_url: string | null;
  hero_cta_1_text: string;
  hero_cta_1_url: string;
  hero_cta_2_text: string;
  hero_cta_2_url: string;
  hero_cta_3_text: string;
  hero_cta_3_url: string;
  gold_rate_disclaimer: string;
  product_price_disclaimer: string;
  custom_order_info: string;
  about_content: string | null;
  privacy_policy: string | null;
  terms_conditions: string | null;
  footer_about: string;
  seo_default_title: string;
  seo_default_description: string;
  og_image_url: string | null;
  google_analytics_id: string | null;
  google_search_console_verification: string | null;
  gold_rate_api_enabled: boolean;
  gold_rate_api_url: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessHour {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  note: string | null;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  product_code: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  purity: GoldPurity;
  gross_weight_grams: string; // numeric returned as string by postgrest
  pricing_method: PricingMethod;
  fixed_price: string | null;
  discount_type: DiscountType;
  discount_value: string;
  availability_status: AvailabilityStatus;
  gender: Gender;
  is_bridal: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_active: boolean;
  is_draft: boolean;
  is_sample: boolean;
  cover_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  view_count: number;
  inquiry_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface ProductWithRelations extends Product {
  category: Category | null;
  images: ProductImage[];
  collections: Collection[];
}

export interface GoldRate {
  id: string;
  purity: GoldPurity;
  rate_per_tola: string;
  rate_per_10_grams: string;
  rate_per_gram: string;
  previous_rate_per_tola: string | null;
  rate_change: string;
  percentage_change: string;
  rate_source: string;
  is_manual: boolean;
  is_manual_override: boolean;
  is_active: boolean;
  notes: string | null;
  effective_date: string;
  effective_time: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoldRateHistoryEntry {
  id: string;
  purity: GoldPurity;
  rate_per_tola: string;
  rate_per_10_grams: string;
  rate_per_gram: string;
  previous_rate_per_tola: string | null;
  rate_change: string;
  percentage_change: string;
  rate_source: string;
  is_manual: boolean;
  is_manual_override: boolean;
  notes: string | null;
  effective_date: string;
  effective_time: string;
  changed_by: string | null;
  created_at: string;
}

export interface Inquiry {
  id: string;
  inquiry_number: string;
  customer_name: string;
  mobile_number: string;
  whatsapp_number: string | null;
  email: string | null;
  product_id: string | null;
  product_code_snapshot: string | null;
  purity_snapshot: GoldPurity | null;
  gross_weight_snapshot: string | null;
  display_price_snapshot: string | null;
  message: string | null;
  source: string;
  status: InquiryStatus;
  admin_notes: string | null;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomOrder {
  id: string;
  order_number: string;
  customer_name: string;
  mobile_number: string;
  whatsapp_number: string | null;
  email: string | null;
  jewelry_type: string;
  gold_purity: GoldPurity | null;
  approx_weight_grams: string | null;
  budget: string | null;
  required_date: string | null;
  design_description: string | null;
  reference_image_url: string | null;
  preferred_contact_method: ContactMethod;
  additional_notes: string | null;
  status: CustomOrderStatus;
  admin_notes: string | null;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  mobile_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  preferred_contact_method: ContactMethod;
  status: InquiryStatus;
  created_at: string;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  rating: number;
  review: string;
  customer_image_url: string | null;
  testimonial_date: string;
  is_approved: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  mobile_image_url: string | null;
  button_text: string | null;
  button_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface MediaFile {
  id: string;
  file_name: string;
  file_path: string;
  url: string;
  file_type: string;
  file_size_bytes: number;
  alt_text: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
