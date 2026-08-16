import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local filesystem image storage under public/uploads/products. Stores a
 * reference URL on Product.imageUrl — never raw binary in the database.
 *
 * Known Phase 2 limitation (documented in PHASE-2-STATUS.md): a real
 * multi-instance deployment should swap this for object storage (S3-
 * compatible); this keeps Phase 2 self-contained with no external
 * credentials required.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const PUBLIC_PATH_PREFIX = "/uploads/products";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class ProductImageError extends Error {}

export function isSupportedImageFile(file: File): boolean {
  return file.type in EXTENSION_BY_MIME;
}

export async function saveProductImage(file: File): Promise<string> {
  if (!isSupportedImageFile(file)) {
    throw new ProductImageError("Only JPEG, PNG, or WEBP images are allowed.");
  }
  if (file.size === 0) {
    throw new ProductImageError("The selected image file is empty.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ProductImageError("Image must be smaller than 5 MB.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const extension = EXTENSION_BY_MIME[file.type];
  const filename = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return `${PUBLIC_PATH_PREFIX}/${filename}`;
}

/** Best-effort cleanup — a missing/already-deleted file is not an error. */
export async function deleteProductImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith(`${PUBLIC_PATH_PREFIX}/`)) return;
  const filename = imageUrl.slice(PUBLIC_PATH_PREFIX.length + 1);
  // Defense in depth: filenames are always our own randomUUID output, but
  // never trust a stored string enough to build an unchecked filesystem path.
  if (filename.includes("/") || filename.includes("..")) return;
  await unlink(path.join(UPLOAD_DIR, filename)).catch(() => {});
}
