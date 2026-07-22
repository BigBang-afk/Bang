"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { productSchema } from "@/lib/validations/product";
import { uploadPublicImage, deletePublicImage, ImageValidationError } from "@/lib/supabase/storage";

export interface ActionState {
  error?: string;
  success?: string;
}

function parseCollectionIds(formData: FormData): string[] {
  return formData.getAll("collection_ids").map(String).filter(Boolean);
}

async function syncProductCollections(db: ReturnType<typeof createAdminClient>, productId: string, collectionIds: string[]) {
  await db.from("product_collections").delete().eq("product_id", productId);
  if (collectionIds.length > 0) {
    await db.from("product_collections").insert(collectionIds.map((collection_id) => ({ product_id: productId, collection_id })));
  }
}

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    product_code: formData.get("product_code"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || "",
    category_id: formData.get("category_id") || null,
    purity: formData.get("purity"),
    gross_weight_grams: formData.get("gross_weight_grams"),
    pricing_method: formData.get("pricing_method"),
    fixed_price: formData.get("fixed_price") || null,
    discount_type: formData.get("discount_type") || "none",
    discount_value: formData.get("discount_value") || 0,
    availability_status: formData.get("availability_status") || "in_stock",
    gender: formData.get("gender") || "women",
    is_bridal: formData.get("is_bridal") === "on",
    is_featured: formData.get("is_featured") === "on",
    is_new_arrival: formData.get("is_new_arrival") === "on",
    is_active: formData.get("is_active") === "on",
    is_draft: formData.get("is_draft") === "on",
    seo_title: formData.get("seo_title") || "",
    seo_description: formData.get("seo_description") || "",
  });
}

export async function createProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("products.create");
  const parsed = parseProductForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid product data." };

  const db = createAdminClient();

  const { data: product, error } = await db
    .from("products")
    .insert({ ...parsed.data, created_by: admin.id, updated_by: admin.id })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "A product with this code or slug already exists." };
    return { error: `Failed to create product: ${error.message}` };
  }

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 0) {
    try {
      const uploaded = await Promise.all(files.map((f) => uploadPublicImage(f, "products")));
      await db.from("product_images").insert(
        uploaded.map((u, i) => ({ product_id: product.id, image_url: u.url, display_order: i, is_cover: i === 0 }))
      );
      await db.from("products").update({ cover_image_url: uploaded[0].url }).eq("id", product.id);
    } catch (err) {
      // Product was created; surface the image error but keep the product.
      const message = err instanceof ImageValidationError ? err.message : "Some images failed to upload.";
      await recordAdminAction(admin, "product_created", "products", product.id, parsed.data.name);
      revalidatePath("/admin/products");
      return { error: `Product created, but: ${message} You can add images from the edit page.` };
    }
  }

  await syncProductCollections(db, product.id, parseCollectionIds(formData));
  await recordAdminAction(admin, "product_created", "products", product.id, parsed.data.name);

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  redirect(`/admin/products/${product.id}/edit`);
}

export async function updateProductAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("products.update");
  const parsed = parseProductForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid product data." };

  const db = createAdminClient();
  const { error } = await db.from("products").update({ ...parsed.data, updated_by: admin.id }).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "A product with this code or slug already exists." };
    return { error: `Failed to update product: ${error.message}` };
  }

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 0) {
    const { count } = await db.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", id);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadPublicImage(f, "products")));
      await db.from("product_images").insert(
        uploaded.map((u, i) => ({ product_id: id, image_url: u.url, display_order: (count ?? 0) + i, is_cover: (count ?? 0) === 0 && i === 0 }))
      );
      if ((count ?? 0) === 0) {
        await db.from("products").update({ cover_image_url: uploaded[0].url }).eq("id", id);
      }
    } catch {
      // Non-fatal — product fields already saved.
    }
  }

  await syncProductCollections(db, id, parseCollectionIds(formData));
  await recordAdminAction(admin, "product_updated", "products", id, parsed.data.name);

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath(`/products/${parsed.data.slug}`);
  revalidatePath("/");
  return { success: "Product saved." };
}

export async function deleteProductAction(id: string, hard = false) {
  const admin = await requirePermission("products.delete");
  const db = createAdminClient();

  if (hard) {
    const { data: images } = await db.from("product_images").select("image_url").eq("product_id", id);
    await Promise.all((images ?? []).map((img) => deletePublicImage(img.image_url).catch(() => {})));
    await db.from("products").delete().eq("id", id);
    await recordAdminAction(admin, "product_hard_deleted", "products", id);
  } else {
    await db.from("products").update({ deleted_at: new Date().toISOString(), is_active: false }).eq("id", id);
    await recordAdminAction(admin, "product_soft_deleted", "products", id);
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function restoreProductAction(id: string) {
  const admin = await requirePermission("products.update");
  const db = createAdminClient();
  await db.from("products").update({ deleted_at: null }).eq("id", id);
  await recordAdminAction(admin, "product_restored", "products", id);
  revalidatePath("/admin/products");
}

export async function duplicateProductAction(id: string) {
  const admin = await requirePermission("products.create");
  const db = createAdminClient();
  const { data: original } = await db.from("products").select("*").eq("id", id).single();
  if (!original) throw new Error("Product not found");

  const { id: _id, created_at, updated_at, deleted_at, view_count, inquiry_count, ...rest } = original;
  void _id; void created_at; void updated_at; void deleted_at; void view_count; void inquiry_count;

  const { data: copy, error } = await db
    .from("products")
    .insert({
      ...rest,
      product_code: `${original.product_code}-COPY`,
      name: `${original.name} (Copy)`,
      slug: `${original.slug}-copy-${Date.now()}`,
      is_draft: true,
      is_active: false,
      created_by: admin.id,
      updated_by: admin.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const { data: images } = await db.from("product_images").select("*").eq("product_id", id);
  if (images && images.length > 0) {
    await db.from("product_images").insert(
      images.map((img) => ({ product_id: copy.id, image_url: img.image_url, alt_text: img.alt_text, display_order: img.display_order, is_cover: img.is_cover }))
    );
  }

  const { data: collections } = await db.from("product_collections").select("collection_id").eq("product_id", id);
  if (collections && collections.length > 0) {
    await db.from("product_collections").insert(collections.map((c) => ({ product_id: copy.id, collection_id: c.collection_id })));
  }

  await recordAdminAction(admin, "product_duplicated", "products", copy.id, `Duplicated from ${original.name}`);
  revalidatePath("/admin/products");
}

export async function toggleProductFlagAction(id: string, field: "is_active" | "is_featured" | "is_new_arrival" | "is_draft", value: boolean) {
  const admin = await requirePermission("products.update");
  const db = createAdminClient();
  await db.from("products").update({ [field]: value, updated_by: admin.id }).eq("id", id);
  await recordAdminAction(admin, "product_flag_toggled", "products", id, `${field} = ${value}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function generateProductCodeAction(categoryId: string): Promise<string> {
  await requirePermission("products.create");
  const db = createAdminClient();
  const { data: category } = await db.from("categories").select("code").eq("id", categoryId).single();
  if (!category) throw new Error("Category not found");
  const { data, error } = await db.rpc("next_product_code", { category_prefix: category.code });
  if (error) throw new Error(error.message);
  return data as string;
}

export interface BulkActionState {
  error?: string;
  success?: string;
}

export async function bulkUpdateProductsAction(
  ids: string[],
  update: Partial<{ is_active: boolean; is_draft: boolean; category_id: string; availability_status: string }>
) {
  const admin = await requirePermission("products.update");
  if (ids.length === 0) return;
  const db = createAdminClient();
  await db.from("products").update({ ...update, updated_by: admin.id }).in("id", ids);
  await recordAdminAction(admin, "products_bulk_updated", "products", null, `${ids.length} products: ${JSON.stringify(update)}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}
