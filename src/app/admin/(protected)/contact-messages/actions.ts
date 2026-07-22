"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/lib/constants";

export async function updateContactMessageStatusAction(id: string, status: InquiryStatus) {
  const admin = await requirePermission("contact_messages.update");
  if (!INQUIRY_STATUSES.includes(status)) throw new Error("Invalid status");
  const db = createAdminClient();
  await db.from("contact_messages").update({ status }).eq("id", id);
  await recordAdminAction(admin, "contact_message_status_updated", "contact_messages", id, status);
  revalidatePath("/admin/contact-messages");
}

export async function deleteContactMessageAction(id: string) {
  const admin = await requirePermission("contact_messages.delete");
  const db = createAdminClient();
  await db.from("contact_messages").delete().eq("id", id);
  await recordAdminAction(admin, "contact_message_deleted", "contact_messages", id);
  revalidatePath("/admin/contact-messages");
}
