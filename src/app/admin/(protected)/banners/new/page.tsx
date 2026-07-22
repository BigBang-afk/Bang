import type { Metadata } from "next";
import { BannerForm } from "@/components/admin/banner-form";
import { createBannerAction } from "../actions";

export const metadata: Metadata = { title: "Add Banner" };

export default function NewBannerPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-charcoal">Add Banner</h1>
      <BannerForm action={createBannerAction} />
    </div>
  );
}
