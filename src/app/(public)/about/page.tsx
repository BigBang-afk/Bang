import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/section-heading";
import { LinkButton } from "@/components/ui/button";
import { getWebsiteSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Zarghoon Jewellers, a gold and jewelry shop in Liaquat Bazar, Sarafa Market, Quetta.",
};

export default async function AboutPage() {
  const settings = await getWebsiteSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Our Story" title={`About ${settings.business_name}`} />
      <div className="mt-10 whitespace-pre-line text-sm leading-relaxed text-charcoal/75 sm:text-base">
        {settings.about_content}
      </div>
      <div className="mt-10 flex justify-center gap-3">
        <LinkButton href="/collections" variant="gold">Explore Collections</LinkButton>
        <LinkButton href="/contact" variant="outline">Visit Our Showroom</LinkButton>
      </div>
    </div>
  );
}
