import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";

export type UploadFolder = "products" | "categories" | "collections" | "banners" | "testimonials" | "branding";

export interface UploadResult {
  url: string;
  path: string;
}

export class ImageValidationError extends Error {}

function assertValidImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new ImageValidationError("Only JPEG, PNG, or WebP images are allowed.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ImageValidationError("Image must be smaller than 5MB.");
  }
  if (file.size === 0) {
    throw new ImageValidationError("The uploaded file is empty.");
  }
}

function safeExtension(file: File): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[file.type] ?? "jpg";
}

/** Uploads a validated image to the public zarghoon-media bucket and returns its public URL. */
export async function uploadPublicImage(file: File, folder: UploadFolder): Promise<UploadResult> {
  assertValidImage(file);

  const db = createAdminClient();
  const path = `${folder}/${crypto.randomUUID()}.${safeExtension(file)}`;

  const { error } = await db.storage.from("zarghoon-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = db.storage.from("zarghoon-media").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Uploads a custom-order reference image to the private bucket. Not publicly readable. */
export async function uploadPrivateReference(file: File): Promise<UploadResult> {
  assertValidImage(file);

  const db = createAdminClient();
  const path = `references/${crypto.randomUUID()}.${safeExtension(file)}`;

  const { error } = await db.storage.from("custom-order-references").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Reference image upload failed: ${error.message}`);

  return { url: path, path };
}

export async function getSignedReferenceUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db.storage.from("custom-order-references").createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export async function deletePublicImage(path: string): Promise<void> {
  const db = createAdminClient();
  await db.storage.from("zarghoon-media").remove([path]);
}
