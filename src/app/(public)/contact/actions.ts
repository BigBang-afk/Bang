"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { contactMessageSchema, HONEYPOT_FIELD } from "@/lib/validations/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity-log";

export interface ContactState {
  error?: string;
  success?: string;
}

export async function submitContactMessageAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  if (formData.get(HONEYPOT_FIELD)) {
    return { success: "Thank you for reaching out! We'll get back to you shortly." };
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`contact:${ip}`, 5, 10 * 60);
  if (!rl.allowed) {
    return { error: "Too many messages submitted. Please try again shortly or contact us on WhatsApp." };
  }

  const parsed = contactMessageSchema.safeParse({
    name: formData.get("name"),
    mobile_number: formData.get("mobile_number") || "",
    whatsapp_number: formData.get("whatsapp_number") || "",
    email: formData.get("email") || "",
    subject: formData.get("subject") || "",
    message: formData.get("message"),
    preferred_contact_method: formData.get("preferred_contact_method") || "whatsapp",
    [HONEYPOT_FIELD]: "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const db = createAdminClient();
  const { error } = await db.from("contact_messages").insert({
    name: parsed.data.name,
    mobile_number: parsed.data.mobile_number || null,
    whatsapp_number: parsed.data.whatsapp_number || null,
    email: parsed.data.email || null,
    subject: parsed.data.subject || null,
    message: parsed.data.message,
    preferred_contact_method: parsed.data.preferred_contact_method,
    status: "new",
  });

  if (error) {
    return { error: "Something went wrong sending your message. Please try again or contact us on WhatsApp." };
  }

  await logActivity({ userId: null, action: "contact_message_submitted", entityType: "contact_messages", description: `From ${parsed.data.name}` });
  revalidatePath("/admin/contact-messages");

  return { success: "Thank you for reaching out! We'll get back to you shortly." };
}
