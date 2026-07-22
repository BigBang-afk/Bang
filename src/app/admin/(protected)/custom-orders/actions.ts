"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedReferenceUrl } from "@/lib/supabase/storage";
import { CUSTOM_ORDER_STATUSES, type CustomOrderStatus } from "@/lib/constants";

export async function updateCustomOrderStatusAction(id: string, status: CustomOrderStatus) {
  const admin = await requirePermission("custom_orders.update");
  if (!CUSTOM_ORDER_STATUSES.includes(status)) throw new Error("Invalid status");
  const db = createAdminClient();
  await db.from("custom_orders").update({ status }).eq("id", id);
  await recordAdminAction(admin, "custom_order_status_updated", "custom_orders", id, status);
  revalidatePath("/admin/custom-orders");
}

export async function updateCustomOrderNotesAction(id: string, notes: string) {
  const admin = await requirePermission("custom_orders.update");
  const db = createAdminClient();
  await db.from("custom_orders").update({ admin_notes: notes }).eq("id", id);
  await recordAdminAction(admin, "custom_order_notes_updated", "custom_orders", id);
  revalidatePath("/admin/custom-orders");
}

export async function deleteCustomOrderAction(id: string) {
  const admin = await requirePermission("custom_orders.delete");
  const db = createAdminClient();
  await db.from("custom_orders").delete().eq("id", id);
  await recordAdminAction(admin, "custom_order_deleted", "custom_orders", id);
  revalidatePath("/admin/custom-orders");
}

export async function getReferenceImageSignedUrlAction(path: string): Promise<string | null> {
  await requirePermission("custom_orders.read");
  return getSignedReferenceUrl(path);
}
