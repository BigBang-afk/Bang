import type { Metadata } from "next";
import { getWebsiteSettings } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Terms & Conditions", robots: { index: true, follow: true } };

export default async function TermsPage() {
  const settings = await getWebsiteSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-serif text-3xl text-charcoal">Terms &amp; Conditions</h1>
      <div className="whitespace-pre-line text-sm leading-relaxed text-charcoal/75">{settings.terms_conditions}</div>
    </div>
  );
}
