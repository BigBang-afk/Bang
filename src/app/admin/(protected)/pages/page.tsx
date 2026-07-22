import type { Metadata } from "next";
import { getWebsiteSettings } from "@/lib/data/settings";
import { PagesForm } from "./pages-form";

export const metadata: Metadata = { title: "Pages" };

export default async function PagesPage() {
  const settings = await getWebsiteSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-charcoal">Pages</h1>
        <p className="text-sm text-charcoal/60">Edit the About Us, Privacy Policy, and Terms &amp; Conditions pages.</p>
      </div>
      <PagesForm settings={settings} />
    </div>
  );
}
