import { NextRequest } from "next/server";
import { isNextResponse, jsonError, jsonOk, requireAdmin } from "@/lib/api-helpers";
import { saveUploadedImage, UploadValidationError } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const formData = await request.formData();
  const file = formData.get("file");
  const subdir = (formData.get("subdir") as string | null) ?? "misc";

  if (!(file instanceof File)) {
    return jsonError("No file was uploaded.", 400);
  }

  try {
    const result = await saveUploadedImage(file, subdir);
    return jsonOk({ url: result.url }, 201);
  } catch (err) {
    if (err instanceof UploadValidationError) return jsonError(err.message, 422);
    console.error("upload error", err);
    return jsonError("Upload failed.", 500);
  }
}
