"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { categorySchema, collectionSchema } from "@/lib/validations/product";
import { uploadPublicImage, deletePublicImage, ImageValidationError } from "@/lib/supabase/storage";

export interface ActionState {
  error?: string;
  success?: string;
}

type Table = "categories" | "collections";

function schemaFor(table: Table) {
  return table === "categories" ? categorySchema : collectionSchema;
}

async function parseTaxonomyForm(formData: FormData, table: Table, existingImageUrl: string | null) {
  let imageUrl = existingImageUrl;
  const file = formData.get("image_file");
  if (file instanceof File && file.size > 0) {
    const { url } = await uploadPublicImage(file, table === "categories" ? "categories" : "collections");
    if (existingImageUrl) await deletePublicImage(existingImageUrl).catch(() => {});
    imageUrl = url;
  }

  const parsed = schemaFor(table).safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    ...(table === "categories" ? { code: formData.get("code") } : {}),
    description: formData.get("description") || "",
    image_url: imageUrl,
    seo_title: formData.get("seo_title") || "",
    seo_description: formData.get("seo_description") || "",
    display_order: formData.get("display_order") || 0,
    is_active: formData.get("is_active") === "on",
  });

  return parsed;
}

export async function createTaxonomyAction(table: Table, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission(`${table}.create`);

  let parsed;
  try {
    parsed = await parseTaxonomyForm(formData, table, null);
  } catch (err) {
    return { error: err instanceof ImageValidationError ? err.message : "Failed to upload image." };
  }
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const db = createAdminClient();
  const { error, data } = await db.from(table).insert(parsed.data).select("id").single();
  if (error) {
    if (error.code === "23505") return { error: "A record with this slug already exists." };
    return { error: `Failed to create: ${error.message}` };
  }

  await recordAdminAction(admin, `${table}_created`, table, data.id, parsed.data.name);
  revalidatePath(`/admin/${table}`);
  revalidatePath("/collections");
  revalidatePath("/products");
  redirect(`/admin/${table}`);
}

export async function updateTaxonomyAction(
  table: Table,
  id: string,
  existingImageUrl: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requirePermission(`${table}.update`);

  let parsed;
  try {
    parsed = await parseTaxonomyForm(formData, table, existingImageUrl);
  } catch (err) {
    return { error: err instanceof ImageValidationError ? err.message : "Failed to upload image." };
  }
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const db = createAdminClient();
  const { error } = await db.from(table).update(parsed.data).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "A record with this slug already exists." };
    return { error: `Failed to update: ${error.message}` };
  }

  await recordAdminAction(admin, `${table}_updated`, table, id, parsed.data.name);
  revalidatePath(`/admin/${table}`);
  revalidatePath("/collections");
  revalidatePath("/products");
  redirect(`/admin/${table}`);
}

export async function deleteTaxonomyAction(table: Table, id: string) {
  const admin = await requirePermission(`${table}.delete`);
  const db = createAdminClient();
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  await recordAdminAction(admin, `${table}_deleted`, table, id);
  revalidatePath(`/admin/${table}`);
  revalidatePath("/collections");
}

export async function toggleTaxonomyActiveAction(table: Table, id: string, isActive: boolean) {
  const admin = await requirePermission(`${table}.update`);
  const db = createAdminClient();
  await db.from(table).update({ is_active: isActive }).eq("id", id);
  await recordAdminAction(admin, `${table}_toggled`, table, id, isActive ? "activated" : "deactivated");
  revalidatePath(`/admin/${table}`);
  revalidatePath("/collections");
}
