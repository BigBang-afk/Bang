"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { deletePublicImage } from "@/lib/supabase/storage";

export async function setCoverImageAction(productId: string, imageId: string, imageUrl: string) {
  const admin = await requirePermission("products.update");
  const db = createAdminClient();
  await db.from("product_images").update({ is_cover: false }).eq("product_id", productId);
  await db.from("product_images").update({ is_cover: true }).eq("id", imageId);
  await db.from("products").update({ cover_image_url: imageUrl, updated_by: admin.id }).eq("id", productId);
  await recordAdminAction(admin, "product_cover_image_set", "products", productId);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/products");
}

export async function deleteProductImageAction(productId: string, imageId: string, imageUrl: string) {
  const admin = await requirePermission("products.update");
  const db = createAdminClient();
  await db.from("product_images").delete().eq("id", imageId);
  await deletePublicImage(imageUrl).catch(() => {});

  const { data: remaining } = await db.from("product_images").select("*").eq("product_id", productId).order("display_order").limit(1);
  if (remaining && remaining.length > 0) {
    await db.from("product_images").update({ is_cover: true }).eq("id", remaining[0].id);
    await db.from("products").update({ cover_image_url: remaining[0].image_url }).eq("id", productId);
  } else {
    await db.from("products").update({ cover_image_url: null }).eq("id", productId);
  }

  await recordAdminAction(admin, "product_image_deleted", "products", productId);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/products");
}

export async function reorderProductImageAction(productId: string, imageId: string, direction: "up" | "down") {
  await requirePermission("products.update");
  const db = createAdminClient();
  const { data: images } = await db.from("product_images").select("id, display_order").eq("product_id", productId).order("display_order");
  if (!images) return;

  const idx = images.findIndex((i) => i.id === imageId);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= images.length) return;

  const a = images[idx];
  const b = images[swapWith];
  await db.from("product_images").update({ display_order: b.display_order }).eq("id", a.id);
  await db.from("product_images").update({ display_order: a.display_order }).eq("id", b.id);

  revalidatePath(`/admin/products/${productId}/edit`);
}

export async function updateImageAltTextAction(productId: string, imageId: string, altText: string) {
  await requirePermission("products.update");
  const db = createAdminClient();
  await db.from("product_images").update({ alt_text: altText }).eq("id", imageId);
  revalidatePath(`/admin/products/${productId}/edit`);
}
