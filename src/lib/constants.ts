/**
 * Hard constants: physical unit conversions and enum lists that never change
 * at runtime. All *business* content (phone numbers, address, disclaimers,
 * hero text, etc.) lives in the `website_settings` table, editable from the
 * admin panel — never hardcode that here.
 */

export const GRAMS_PER_TOLA = 11.6638;
export const GRAMS_PER_MASHA = 0.972;
export const GRAMS_PER_RATTI = 0.1215;

export const GOLD_PURITIES = ["24K", "22K", "21K", "18K"] as const;
export type GoldPurity = (typeof GOLD_PURITIES)[number];

export const PURITY_FACTOR: Record<GoldPurity, number> = {
  "24K": 24 / 24,
  "22K": 22 / 24,
  "21K": 21 / 24,
  "18K": 18 / 24,
};

export const WEIGHT_UNITS = ["gram", "tola", "10gram", "masha", "ratti"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  gram: "Gram (g)",
  tola: "Tola",
  "10gram": "10 Grams",
  masha: "Masha",
  ratti: "Ratti",
};

export function convertToGrams(value: number, unit: WeightUnit): number {
  switch (unit) {
    case "gram":
      return value;
    case "tola":
      return value * GRAMS_PER_TOLA;
    case "10gram":
      return value * 10;
    case "masha":
      return value * GRAMS_PER_MASHA;
    case "ratti":
      return value * GRAMS_PER_RATTI;
  }
}

export const PRICING_METHODS = ["automatic", "fixed", "contact", "on_request"] as const;
export type PricingMethod = (typeof PRICING_METHODS)[number];

export const PRICING_METHOD_LABELS: Record<PricingMethod, string> = {
  automatic: "Automatic Gold Rate Price",
  fixed: "Fixed Price",
  contact: "Contact for Latest Price",
  on_request: "Price Available on Request",
};

export const DISCOUNT_TYPES = ["none", "fixed", "percentage"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const AVAILABILITY_STATUSES = ["in_stock", "made_to_order", "out_of_stock", "reserved", "sold"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  in_stock: "In Stock",
  made_to_order: "Made to Order",
  out_of_stock: "Out of Stock",
  reserved: "Reserved",
  sold: "Sold",
};

export const INQUIRY_STATUSES = ["new", "contacted", "interested", "follow_up", "completed", "cancelled", "spam"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const CUSTOM_ORDER_STATUSES = [
  "new",
  "reviewed",
  "customer_contacted",
  "quotation_sent",
  "approved",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type CustomOrderStatus = (typeof CUSTOM_ORDER_STATUSES)[number];

export const CONTACT_METHODS = ["whatsapp", "phone_call", "email", "showroom_visit"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const ADMIN_ROLES = ["super_admin", "admin", "product_manager", "content_manager"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  product_manager: "Product Manager",
  content_manager: "Content Manager",
};

export const DEFAULT_CATEGORIES = [
  { name: "Rings", code: "RNG" },
  { name: "Earrings", code: "EAR" },
  { name: "Necklaces", code: "NCK" },
  { name: "Bangles", code: "BNG" },
  { name: "Bracelets", code: "BRC" },
  { name: "Chains", code: "CHN" },
  { name: "Pendants", code: "PND" },
  { name: "Bridal Sets", code: "BRD" },
  { name: "Men's Jewelry", code: "MEN" },
  { name: "Kids Jewelry", code: "KID" },
  { name: "New Arrivals", code: "NEW" },
  { name: "Custom Designs", code: "CUS" },
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const SITE_NAME = "Zarghoon Jewellers";
