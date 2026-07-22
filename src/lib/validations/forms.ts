import { z } from "zod";
import { CONTACT_METHODS, GOLD_PURITIES } from "@/lib/constants";

const pkPhone = z
  .string()
  .trim()
  .min(7, "Enter a valid mobile number")
  .max(20)
  .regex(/^[0-9+\-\s()]+$/, "Enter a valid mobile number");

/** Honeypot field name shared across all public forms for spam bots. */
export const HONEYPOT_FIELD = "website_url";

const honeypot = z.string().max(0, "Spam detected").optional().or(z.literal(""));

export const inquirySchema = z.object({
  customer_name: z.string().trim().min(2, "Name is required").max(100),
  mobile_number: pkPhone,
  whatsapp_number: pkPhone.optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  product_id: z.string().uuid(),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  [HONEYPOT_FIELD]: honeypot,
});
export type InquiryFormInput = z.infer<typeof inquirySchema>;

export const customOrderSchema = z.object({
  customer_name: z.string().trim().min(2, "Name is required").max(100),
  mobile_number: pkPhone,
  whatsapp_number: pkPhone.optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  jewelry_type: z.string().trim().min(2, "Jewelry type is required").max(100),
  gold_purity: z.enum(GOLD_PURITIES).optional(),
  approx_weight_grams: z.coerce.number().min(0).optional(),
  budget: z.coerce.number().min(0).optional(),
  design_description: z.string().trim().max(2000).optional().or(z.literal("")),
  reference_image_url: z.string().url().optional().or(z.literal("")),
  preferred_contact_method: z.enum(CONTACT_METHODS).default("whatsapp"),
  required_date: z.string().optional().or(z.literal("")),
  additional_notes: z.string().trim().max(1000).optional().or(z.literal("")),
  [HONEYPOT_FIELD]: honeypot,
});
export type CustomOrderFormInput = z.infer<typeof customOrderSchema>;

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  mobile_number: pkPhone.optional().or(z.literal("")),
  whatsapp_number: pkPhone.optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  subject: z.string().trim().max(150).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Message is required").max(2000),
  preferred_contact_method: z.enum(CONTACT_METHODS).default("whatsapp"),
  [HONEYPOT_FIELD]: honeypot,
});
export type ContactMessageFormInput = z.infer<typeof contactMessageSchema>;

export const testimonialSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  rating: z.coerce.number().int().min(1).max(5),
  review: z.string().trim().min(5).max(1000),
  customer_image_url: z.string().url().nullable().optional(),
  testimonial_date: z.string().optional(),
  is_approved: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  display_order: z.coerce.number().int().default(0),
});
export type TestimonialInput = z.infer<typeof testimonialSchema>;

export const bannerSchema = z.object({
  title: z.string().trim().min(2).max(150),
  subtitle: z.string().trim().max(200).optional().or(z.literal("")),
  image_url: z.string().url("Desktop image is required"),
  mobile_image_url: z.string().url().optional().or(z.literal("")),
  button_text: z.string().trim().max(50).optional().or(z.literal("")),
  button_url: z.string().trim().max(300).optional().or(z.literal("")),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  display_order: z.coerce.number().int().default(0),
});
export type BannerInput = z.infer<typeof bannerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;
