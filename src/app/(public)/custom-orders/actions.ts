"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { customOrderSchema, HONEYPOT_FIELD } from "@/lib/validations/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { uploadPrivateReference, ImageValidationError } from "@/lib/supabase/storage";
import { logActivity } from "@/lib/activity-log";

export interface CustomOrderState {
  error?: string;
  success?: string;
  orderNumber?: string;
}

export async function submitCustomOrderAction(_prev: CustomOrderState, formData: FormData): Promise<CustomOrderState> {
  // Honeypot: real users never fill this hidden field.
  if (formData.get(HONEYPOT_FIELD)) {
    return { success: "Thank you! Your custom order request has been received." };
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`custom-order:${ip}`, 3, 10 * 60);
  if (!rl.allowed) {
    return { error: "You've submitted a few requests already. Please try again in a few minutes or contact us on WhatsApp." };
  }

  const parsed = customOrderSchema.safeParse({
    customer_name: formData.get("customer_name"),
    mobile_number: formData.get("mobile_number"),
    whatsapp_number: formData.get("whatsapp_number") || "",
    email: formData.get("email") || "",
    jewelry_type: formData.get("jewelry_type"),
    gold_purity: formData.get("gold_purity") || undefined,
    approx_weight_grams: formData.get("approx_weight_grams") || undefined,
    budget: formData.get("budget") || undefined,
    design_description: formData.get("design_description") || "",
    preferred_contact_method: formData.get("preferred_contact_method") || "whatsapp",
    required_date: formData.get("required_date") || "",
    additional_notes: formData.get("additional_notes") || "",
    [HONEYPOT_FIELD]: "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  let referenceImagePath: string | null = null;
  const referenceFile = formData.get("reference_image_file");
  if (referenceFile instanceof File && referenceFile.size > 0) {
    try {
      const { path } = await uploadPrivateReference(referenceFile);
      referenceImagePath = path;
    } catch (err) {
      if (err instanceof ImageValidationError) return { error: err.message };
      return { error: "Failed to upload reference image. Please try again." };
    }
  }

  const db = createAdminClient();
  const { data: numberData } = await db.rpc("next_custom_order_number");
  const orderNumber = (numberData as string) ?? `ZJ-CO-${Date.now()}`;

  const { error } = await db.from("custom_orders").insert({
    order_number: orderNumber,
    customer_name: parsed.data.customer_name,
    mobile_number: parsed.data.mobile_number,
    whatsapp_number: parsed.data.whatsapp_number || null,
    email: parsed.data.email || null,
    jewelry_type: parsed.data.jewelry_type,
    gold_purity: parsed.data.gold_purity || null,
    approx_weight_grams: parsed.data.approx_weight_grams || null,
    budget: parsed.data.budget || null,
    required_date: parsed.data.required_date || null,
    design_description: parsed.data.design_description || null,
    reference_image_url: referenceImagePath,
    preferred_contact_method: parsed.data.preferred_contact_method,
    additional_notes: parsed.data.additional_notes || null,
    status: "new",
  });

  if (error) {
    return { error: "Something went wrong submitting your request. Please try again or contact us on WhatsApp." };
  }

  await logActivity({
    userId: null,
    action: "custom_order_submitted",
    entityType: "custom_orders",
    description: `${orderNumber} from ${parsed.data.customer_name}`,
  });

  revalidatePath("/admin/custom-orders");

  return { success: "Thank you! Your custom order request has been received. Our team will contact you shortly.", orderNumber };
}
