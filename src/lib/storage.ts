import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local-disk storage adapter (default for self-hosted / VPS deployments).
 * To use S3 or another object store in production, replace the body of
 * `saveUploadedFile` with a call to your provider's SDK and return the
 * public URL it gives you — nothing else in the app needs to change since
 * all callers only deal with the returned URL string.
 */

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export class UploadValidationError extends Error {}

function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? "8");
  return mb * 1024 * 1024;
}

export async function saveUploadedImage(
  file: File,
  subdir: string,
): Promise<{ url: string; filename: string }> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new UploadValidationError(
      `Unsupported file type "${file.type}". Allowed: JPEG, PNG, WEBP, AVIF.`,
    );
  }
  if (file.size > maxUploadBytes()) {
    throw new UploadValidationError(
      `File is too large. Maximum size is ${process.env.MAX_UPLOAD_MB ?? "8"}MB.`,
    );
  }

  const ext = extensionForMime(file.type);
  const filename = `${randomUUID()}.${ext}`;
  const uploadsRoot = process.env.UPLOADS_DIR ?? "public/uploads";
  // Path root is env-driven (runtime upload storage location), not part of
  // the app's source tree — safe to exclude from build-time file tracing.
  const targetDir = path.join(/* turbopackIgnore: true */ process.cwd(), uploadsRoot, subdir);
  await mkdir(targetDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(targetDir, filename), buffer);

  const publicRoot = uploadsRoot.replace(/^public\/?/, "/");
  const url = path.posix.join(publicRoot.startsWith("/") ? publicRoot : `/${publicRoot}`, subdir, filename);
  return { url, filename };
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return "bin";
  }
}
