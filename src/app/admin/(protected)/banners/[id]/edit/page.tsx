import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BannerForm } from "@/components/admin/banner-form";
import { updateBannerAction } from "../../actions";
import type { Banner } from "@/types/database";

export const metadata: Metadata = { title: "Edit Banner" };

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const { data: banner } = await db.from("banners").select("*").eq("id", id).maybeSingle<Banner>();
  if (!banner) notFound();

  const boundAction = updateBannerAction.bind(null, banner.id, { image_url: banner.image_url, mobile_image_url: banner.mobile_image_url });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-charcoal">Edit Banner</h1>
      <BannerForm action={boundAction} initial={banner} />
    </div>
  );
}
