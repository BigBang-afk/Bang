"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { bannerSchema } from "@/lib/validations/forms";
import { uploadPublicImage, deletePublicImage, ImageValidationError } from "@/lib/supabase/storage";

export interface ActionState {
  error?: string;
  success?: string;
}

async function parseForm(formData: FormData, existing?: { image_url: string; mobile_image_url: string | null }) {
  let imageUrl = existing?.image_url ?? null;
  let mobileImageUrl = existing?.mobile_image_url ?? null;

  const desktopFile = formData.get("image_file");
  if (desktopFile instanceof File && desktopFile.size > 0) {
    const { url } = await uploadPublicImage(desktopFile, "banners");
    if (existing?.image_url) await deletePublicImage(existing.image_url).catch(() => {});
    imageUrl = url;
  }

  const mobileFile = formData.get("mobile_image_file");
  if (mobileFile instanceof File && mobileFile.size > 0) {
    const { url } = await uploadPublicImage(mobileFile, "banners");
    if (existing?.mobile_image_url) await deletePublicImage(existing.mobile_image_url).catch(() => {});
    mobileImageUrl = url;
  }

  return bannerSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle") || "",
    image_url: imageUrl,
    mobile_image_url: mobileImageUrl || "",
    button_text: formData.get("button_text") || "",
    button_url: formData.get("button_url") || "",
    start_date: formData.get("start_date") || "",
    end_date: formData.get("end_date") || "",
    is_active: formData.get("is_active") === "on",
    display_order: formData.get("display_order") || 0,
  });
}

export async function createBannerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("banners.create");
  let parsed;
  try {
    parsed = await parseForm(formData);
  } catch (err) {
    return { error: err instanceof ImageValidationError ? err.message : "Failed to upload image." };
  }
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const db = createAdminClient();
  const { error, data } = await db.from("banners").insert({
    ...parsed.data,
    mobile_image_url: parsed.data.mobile_image_url || null,
    button_text: parsed.data.button_text || null,
    button_url: parsed.data.button_url || null,
    start_date: parsed.data.start_date || null,
    end_date: parsed.data.end_date || null,
  }).select("id").single();
  if (error) return { error: `Failed to create: ${error.message}` };

  await recordAdminAction(admin, "banner_created", "banners", data.id, parsed.data.title);
  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners");
}

export async function updateBannerAction(
  id: string,
  existing: { image_url: string; mobile_image_url: string | null },
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requirePermission("banners.update");
  let parsed;
  try {
    parsed = await parseForm(formData, existing);
  } catch (err) {
    return { error: err instanceof ImageValidationError ? err.message : "Failed to upload image." };
  }
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const db = createAdminClient();
  const { error } = await db.from("banners").update({
    ...parsed.data,
    mobile_image_url: parsed.data.mobile_image_url || null,
    button_text: parsed.data.button_text || null,
    button_url: parsed.data.button_url || null,
    start_date: parsed.data.start_date || null,
    end_date: parsed.data.end_date || null,
  }).eq("id", id);
  if (error) return { error: `Failed to update: ${error.message}` };

  await recordAdminAction(admin, "banner_updated", "banners", id, parsed.data.title);
  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners");
}

export async function deleteBannerAction(id: string) {
  const admin = await requirePermission("banners.delete");
  const db = createAdminClient();
  await db.from("banners").delete().eq("id", id);
  await recordAdminAction(admin, "banner_deleted", "banners", id);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function toggleBannerActiveAction(id: string, isActive: boolean) {
  const admin = await requirePermission("banners.update");
  const db = createAdminClient();
  await db.from("banners").update({ is_active: isActive }).eq("id", id);
  await recordAdminAction(admin, "banner_toggled", "banners", id);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}
