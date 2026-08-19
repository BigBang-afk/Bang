import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getHomepageSettings, getActiveCategories, getSettings } from "@/lib/site-data";
import { getPricingContext, priceProductWithRates } from "@/lib/gold";
import { GoldRateBar } from "@/components/site/GoldRateBar";
import { ProductCard } from "@/components/site/ProductCard";
import { ShieldCheck, Award, Clock, Gem } from "lucide-react";

export const metadata: Metadata = {
  title: "Zarghoon Jewellers — Timeless Gold, Trusted Legacy",
  description:
    "Shop premium 24K, 21K and 18K gold jewellery at Zarghoon Jewellers, Liaquat Bazar Sarafa Market, Quetta. Live gold rates, bridal collections and more.",
  alternates: { canonical: "/" },
};

const TRUST_ICONS = [Gem, Award, Clock, ShieldCheck];

export default async function HomePage() {
  const [homepage, categories, settings] = await Promise.all([
    getHomepageSettings(),
    getActiveCategories(),
    getSettings(),
  ]);

  const ctx = await getPricingContext();
  const featuredProducts =
    homepage?.featuredProducts.map((fp) => ({
      ...fp.product,
      price: priceProductWithRates(fp.product, ctx.rates, ctx.useExtras, ctx.precision),
    })) ?? [];

  const banner = homepage?.banners[0];

  const trustBadges = homepage
    ? [
        { title: homepage.trustBadge1Title, text: homepage.trustBadge1Text },
        { title: homepage.trustBadge2Title, text: homepage.trustBadge2Text },
        { title: homepage.trustBadge3Title, text: homepage.trustBadge3Text },
        { title: homepage.trustBadge4Title, text: homepage.trustBadge4Text },
      ]
    : [];

  return (
    <div>
      {homepage?.heroEnabled !== false && (
        <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-brown text-cream">
          {homepage?.heroImageUrl && (
            <Image
              src={homepage.heroImageUrl}
              alt=""
              fill
              priority
              className="object-cover opacity-40"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-maroon-dark/70 via-brown/60 to-brown" />
          <div className="relative z-10 mx-auto max-w-3xl px-6 text-center animate-fade-in-up">
            <p className="mb-4 text-xs uppercase tracking-[0.4em] text-gold">
              {settings.businessName}
            </p>
            <h1 className="font-display text-4xl leading-tight sm:text-6xl">
              {homepage?.heroTitle ?? "Timeless Gold. Trusted Legacy."}
            </h1>
            <div className="gold-divider mx-auto my-6 w-32" />
            <p className="mx-auto max-w-xl text-base text-cream/85 sm:text-lg">
              {homepage?.heroSubtitle ??
                "Experience the beauty of pure gold jewellery, crafted with trust, purity and perfection."}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={homepage?.heroButtonUrl ?? "/collections"}
                className="rounded-sm bg-gold px-8 py-3.5 text-sm font-medium tracking-wide text-maroon-dark transition hover:bg-gold-light"
              >
                {homepage?.heroButtonText ?? "Explore Collection"}
              </Link>
              <Link
                href={homepage?.heroButton2Url ?? "/gold-rate"}
                className="rounded-sm border border-cream/40 px-8 py-3.5 text-sm font-medium tracking-wide text-cream transition hover:border-gold hover:text-gold"
              >
                {homepage?.heroButton2Text ?? "View Gold Rates"}
              </Link>
            </div>
          </div>
        </section>
      )}

      {homepage?.goldRateBarEnabled !== false && (
        <GoldRateBar
          show24k={homepage?.showRate24k}
          show21k={homepage?.showRate21k}
          show18k={homepage?.showRate18k}
        />
      )}

      {categories.length > 0 && homepage && homepage.collections.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-gold-dark">Shop by</p>
            <h2 className="mt-2 font-display text-3xl text-maroon">Our Collections</h2>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {homepage.collections.map(({ category }) => (
              <Link
                key={category.id}
                href={`/collections/${category.slug}`}
                className="group flex flex-col items-center gap-3"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-full border-2 border-gold/30">
                  {category.imageUrl && (
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      sizes="200px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                </div>
                <span className="text-center text-sm font-medium text-brown group-hover:text-maroon">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section className="bg-cream-dark/60 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-10 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-gold-dark">Handpicked</p>
              <h2 className="mt-2 font-display text-3xl text-maroon">Featured Pieces</h2>
            </div>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/collections"
                className="inline-block rounded-sm border border-maroon px-8 py-3 text-sm font-medium text-maroon transition hover:bg-maroon hover:text-cream"
              >
                View All Collections
              </Link>
            </div>
          </div>
        </section>
      )}

      {banner && (
        <section className="relative flex min-h-[45vh] items-center overflow-hidden">
          <Image src={banner.imageUrl} alt={banner.heading ?? ""} fill className="object-cover" />
          <div className="absolute inset-0 bg-maroon-dark/60" />
          <div className="relative z-10 mx-auto max-w-2xl px-6 text-cream">
            {banner.heading && <h2 className="font-display text-3xl sm:text-4xl">{banner.heading}</h2>}
            {banner.description && <p className="mt-3 max-w-md text-cream/85">{banner.description}</p>}
            {banner.buttonText && banner.buttonUrl && (
              <Link
                href={banner.buttonUrl}
                className="mt-6 inline-block rounded-sm bg-gold px-7 py-3 text-sm font-medium text-maroon-dark hover:bg-gold-light"
              >
                {banner.buttonText}
              </Link>
            )}
          </div>
        </section>
      )}

      {trustBadges.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {trustBadges.map((badge, i) => {
              const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
              return (
                <div key={badge.title} className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold text-gold-dark">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="mt-4 font-display text-lg text-brown">{badge.title}</p>
                  <p className="mt-1 text-sm text-brown-light">{badge.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
