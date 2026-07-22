"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, recordAdminAction } from "@/lib/auth";
import { deletePublicImage } from "@/lib/supabase/storage";

export async function deleteMediaFileAction(filePath: string) {
  const admin = await requirePermission("settings.update");
  await deletePublicImage(filePath);
  await recordAdminAction(admin, "media_file_deleted", "media_files", null, filePath);
  revalidatePath("/admin/media");
}
