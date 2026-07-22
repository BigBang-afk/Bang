import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { MediaGrid } from "./media-grid";
import type { MediaFile } from "@/types/database";

export const metadata: Metadata = { title: "Media Library" };

export default async function MediaLibraryPage() {
  const db = createAdminClient();
  const { data, count } = await db.from("media_files").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(200);
  const files = (data ?? []) as MediaFile[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-charcoal">Media Library</h1>
        <p className="text-sm text-charcoal/60">{count ?? 0} uploaded files</p>
      </div>
      <MediaGrid files={files} />
    </div>
  );
}
