"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity-log";
import { HONEYPOT_FIELD } from "@/lib/validations/forms";
import { getProductById } from "@/lib/data/products";
import { getActiveRateMap } from "@/lib/data/gold-rates";
import { computeProductPrice } from "@/lib/pricing/compute";

export interface InquiryState {
  error?: string;
  success?: string;
}

const schema = z.object({
  customer_name: z.string().trim().min(2, "Name is required").max(100),
  mobile_number: z.string().trim().min(7, "Enter a valid mobile number").max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  product_id: z.string().uuid(),
  [HONEYPOT_FIELD]: z.string().max(0).optional().or(z.literal("")),
});

export async function submitProductInquiryAction(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  if (formData.get(HONEYPOT_FIELD)) {
    return { success: "Thank you! We'll contact you shortly." };
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`inquiry:${ip}`, 5, 10 * 60);
  if (!rl.allowed) {
    return { error: "Too many inquiries submitted. Please try again shortly or contact us on WhatsApp." };
  }

  const parsed = schema.safeParse({
    customer_name: formData.get("customer_name"),
    mobile_number: formData.get("mobile_number"),
    email: formData.get("email") || "",
    message: formData.get("message") || "",
    product_id: formData.get("product_id"),
    [HONEYPOT_FIELD]: formData.get(HONEYPOT_FIELD) || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const product = await getProductById(parsed.data.product_id);
  if (!product) return { error: "Product not found." };

  const activeRates = await getActiveRateMap();
  const price = computeProductPrice(product, activeRates);

  const db = createAdminClient();
  const { data: numberData } = await db.rpc("next_inquiry_number");
  const inquiryNumber = (numberData as string) ?? `ZJ-INQ-${Date.now()}`;

  const { error } = await db.from("inquiries").insert({
    inquiry_number: inquiryNumber,
    customer_name: parsed.data.customer_name,
    mobile_number: parsed.data.mobile_number,
    email: parsed.data.email || null,
    product_id: product.id,
    product_code_snapshot: product.product_code,
    purity_snapshot: product.purity,
    gross_weight_snapshot: product.gross_weight_grams,
    display_price_snapshot: price.visible ? price.finalPrice : null,
    message: parsed.data.message || null,
    source: "product_page",
    status: "new",
  });

  if (error) {
    return { error: "Something went wrong. Please try again or contact us on WhatsApp." };
  }

  await db.rpc("increment_product_counter", { p_id: product.id, p_column: "inquiry_count" }).then(() => {}, () => {});
  await logActivity({ userId: null, action: "inquiry_submitted", entityType: "inquiries", description: `${inquiryNumber} for ${product.name}` });

  revalidatePath("/admin/inquiries");

  return { success: "Thank you! Your inquiry has been received. Our team will contact you shortly." };
}

export async function trackProductViewAction(productId: string) {
  const db = createAdminClient();
  await db.rpc("increment_product_counter", { p_id: productId, p_column: "view_count" }).then(() => {}, () => {});
}
