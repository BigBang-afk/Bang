"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { testimonialSchema } from "@/lib/validations/forms";
import { uploadPublicImage, deletePublicImage, ImageValidationError } from "@/lib/supabase/storage";

export interface ActionState {
  error?: string;
  success?: string;
}

async function parseForm(formData: FormData, existingImageUrl: string | null) {
  let imageUrl = existingImageUrl;
  const file = formData.get("image_file");
  if (file instanceof File && file.size > 0) {
    const { url } = await uploadPublicImage(file, "testimonials");
    if (existingImageUrl) await deletePublicImage(existingImageUrl).catch(() => {});
    imageUrl = url;
  }

  return testimonialSchema.safeParse({
    customer_name: formData.get("customer_name"),
    rating: formData.get("rating"),
    review: formData.get("review"),
    customer_image_url: imageUrl,
    testimonial_date: formData.get("testimonial_date") || undefined,
    is_approved: formData.get("is_approved") === "on",
    is_featured: formData.get("is_featured") === "on",
    display_order: formData.get("display_order") || 0,
  });
}

export async function createTestimonialAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("testimonials.create");
  let parsed;
  try {
    parsed = await parseForm(formData, null);
  } catch (err) {
    return { error: err instanceof ImageValidationError ? err.message : "Failed to upload image." };
  }
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const db = createAdminClient();
  const { error, data } = await db.from("testimonials").insert(parsed.data).select("id").single();
  if (error) return { error: `Failed to create: ${error.message}` };

  await recordAdminAction(admin, "testimonial_created", "testimonials", data.id, parsed.data.customer_name);
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials");
}

export async function updateTestimonialAction(id: string, existingImageUrl: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("testimonials.update");
  let parsed;
  try {
    parsed = await parseForm(formData, existingImageUrl);
  } catch (err) {
    return { error: err instanceof ImageValidationError ? err.message : "Failed to upload image." };
  }
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const db = createAdminClient();
  const { error } = await db.from("testimonials").update(parsed.data).eq("id", id);
  if (error) return { error: `Failed to update: ${error.message}` };

  await recordAdminAction(admin, "testimonial_updated", "testimonials", id, parsed.data.customer_name);
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials");
}

export async function deleteTestimonialAction(id: string) {
  const admin = await requirePermission("testimonials.delete");
  const db = createAdminClient();
  await db.from("testimonials").delete().eq("id", id);
  await recordAdminAction(admin, "testimonial_deleted", "testimonials", id);
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function setTestimonialApprovalAction(id: string, approved: boolean) {
  const admin = await requirePermission("testimonials.update");
  const db = createAdminClient();
  await db.from("testimonials").update({ is_approved: approved }).eq("id", id);
  await recordAdminAction(admin, "testimonial_approval_toggled", "testimonials", id, approved ? "approved" : "rejected");
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function setTestimonialFeaturedAction(id: string, featured: boolean) {
  const admin = await requirePermission("testimonials.update");
  const db = createAdminClient();
  await db.from("testimonials").update({ is_featured: featured }).eq("id", id);
  await recordAdminAction(admin, "testimonial_featured_toggled", "testimonials", id);
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}
