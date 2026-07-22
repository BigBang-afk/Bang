"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/lib/constants";

export async function updateInquiryStatusAction(id: string, status: InquiryStatus) {
  const admin = await requirePermission("inquiries.update");
  if (!INQUIRY_STATUSES.includes(status)) throw new Error("Invalid status");
  const db = createAdminClient();
  await db.from("inquiries").update({ status }).eq("id", id);
  await recordAdminAction(admin, "inquiry_status_updated", "inquiries", id, status);
  revalidatePath("/admin/inquiries");
}

export async function updateInquiryNotesAction(id: string, notes: string) {
  const admin = await requirePermission("inquiries.update");
  const db = createAdminClient();
  await db.from("inquiries").update({ admin_notes: notes }).eq("id", id);
  await recordAdminAction(admin, "inquiry_notes_updated", "inquiries", id);
  revalidatePath("/admin/inquiries");
}

export async function assignInquiryAction(id: string, adminId: string | null) {
  const admin = await requirePermission("inquiries.update");
  const db = createAdminClient();
  await db.from("inquiries").update({ assigned_admin_id: adminId }).eq("id", id);
  await recordAdminAction(admin, "inquiry_assigned", "inquiries", id, adminId ?? "unassigned");
  revalidatePath("/admin/inquiries");
}

export async function deleteInquiryAction(id: string) {
  const admin = await requirePermission("inquiries.delete");
  const db = createAdminClient();
  await db.from("inquiries").delete().eq("id", id);
  await recordAdminAction(admin, "inquiry_deleted", "inquiries", id);
  revalidatePath("/admin/inquiries");
}
