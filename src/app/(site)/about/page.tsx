import type { Metadata } from "next";
import { getSettings } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Zarghoon Jewellers — a trusted name in pure gold jewellery in Quetta, Pakistan.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-center text-xs uppercase tracking-[0.3em] text-gold-dark">Our Story</p>
      <h1 className="mt-2 text-center font-display text-4xl text-maroon">About {settings.businessName}</h1>
      <div className="gold-divider mx-auto my-8 w-32" />

      <div className="space-y-6 text-brown-light leading-relaxed">
        <p>
          Nestled in the heart of Liaquat Bazar Sarafa Market, Quetta, {settings.businessName} has stood
          as a trusted name in pure gold jewellery — where craftsmanship meets integrity, and every
          piece tells a story of tradition and trust.
        </p>
        <p>
          We specialise in 24K, 21K and 18K gold jewellery — from timeless bridal sets to
          everyday elegance — each piece hallmark certified and crafted with meticulous attention
          to purity and detail.
        </p>
        <p>
          Our commitment goes beyond jewellery. We believe in building lasting relationships with
          every customer who walks through our doors, offering transparent pricing tied to live
          gold rates, and a promise of quality that has been passed down through generations.
        </p>
      </div>

      <div className="mt-16 grid gap-8 sm:grid-cols-3">
        {[
          { title: "Purity Guaranteed", text: "Every piece is hallmark certified for its stated gold purity." },
          { title: "Transparent Pricing", text: "Prices are always calculated from today's live gold rate." },
          { title: "Trusted Legacy", text: "A name families in Quetta have trusted for their finest moments." },
        ].map((item) => (
          <div key={item.title} className="rounded-sm border border-gold/20 bg-ivory p-6 text-center">
            <p className="font-display text-lg text-maroon">{item.title}</p>
            <p className="mt-2 text-sm text-brown-light">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
