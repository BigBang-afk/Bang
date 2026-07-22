import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Scale, TrendingUp, Gem, Sparkles, Heart, Palette, Headset, MapPin, Phone, Navigation } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { GoldRateBar } from "@/components/gold-rate/gold-rate-bar";
import { CollectionCard } from "@/components/collection/collection-card";
import { ProductCard } from "@/components/product/product-card";
import { TestimonialCard } from "@/components/home/testimonial-card";
import { CustomOrderForm } from "@/components/home/custom-order-form";
import { buildWhatsAppUrl, genericInquiryMessage } from "@/lib/whatsapp";
import { getWebsiteSettings, getBusinessHours } from "@/lib/data/settings";
import { getActiveGoldRates, getActiveRateMap } from "@/lib/data/gold-rates";
import { listCollections, getCollectionProductCounts } from "@/lib/data/collections";
import { listProducts } from "@/lib/data/products";
import { listTestimonials } from "@/lib/data/testimonials";

export const metadata: Metadata = {
  title: "Home",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WHY_US = [
  { icon: ShieldCheck, title: "Trusted Gold Quality", desc: "Every piece reflects the purity and craftsmanship Zarghoon Jewellers is known for in Quetta." },
  { icon: Scale, title: "Transparent Weight Information", desc: "Gross weight is clearly listed on every product — no hidden surprises." },
  { icon: TrendingUp, title: "Current Gold-Rate Pricing", desc: "Prices reflect the day's gold rate, updated by our team." },
  { icon: Gem, title: "Elegant Craftsmanship", desc: "Traditional artistry blended with refined, modern finishing." },
  { icon: Sparkles, title: "Custom Jewelry Orders", desc: "Bring your own design idea to life with our craftsmen." },
  { icon: Heart, title: "Bridal Jewelry Collection", desc: "Exquisite sets crafted for your most special occasions." },
  { icon: Palette, title: "Traditional & Modern Designs", desc: "A curated range spanning heritage motifs to contemporary styles." },
  { icon: Headset, title: "Professional Customer Service", desc: "Our team is here to guide you, in-store or on WhatsApp." },
  { icon: MapPin, title: "Convenient Location", desc: "Visit us in Sarafa Market, Liaquat Bazar, Quetta." },
];

export default async function HomePage() {
  const [settings, goldRates, activeRates, collections, collectionCounts, hours, featured, newArrivals, testimonials] =
    await Promise.all([
      getWebsiteSettings(),
      getActiveGoldRates(),
      getActiveRateMap(),
      listCollections(true),
      getCollectionProductCounts(),
      getBusinessHours(),
      listProducts({ filters: { isFeatured: true }, sort: "featured", pageSize: 8 }),
      listProducts({ filters: { isNewArrival: true }, sort: "newest", pageSize: 4 }),
      listTestimonials(true),
    ]);

  const featuredTestimonials = testimonials.filter((t) => t.is_featured).slice(0, 6);
  const testimonialsToShow = featuredTestimonials.length > 0 ? featuredTestimonials : testimonials.slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center overflow-hidden bg-charcoal text-ivory">
        <div className="absolute inset-0">
          <Image
            src={settings.hero_image_url ?? "https://placehold.co/1920x1080/0b0b0b/c9a24b?text=Zarghoon+Jewellers"}
            alt={settings.business_name}
            fill
            priority
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/70 to-charcoal/40" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8 animate-fade-up">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">{settings.hero_subheading}</p>
          <h1 className="text-balance font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
            <span className="gold-gradient-text">{settings.hero_heading}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-sm leading-relaxed text-ivory/80 sm:text-base">
            {settings.hero_description}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href={settings.hero_cta_1_url} variant="gold" size="lg">{settings.hero_cta_1_text}</LinkButton>
            <LinkButton href={settings.hero_cta_2_url} variant="outline-gold" size="lg" className="!text-ivory !border-ivory/40 hover:!bg-ivory hover:!text-charcoal">
              {settings.hero_cta_2_text}
            </LinkButton>
            <LinkButton href={settings.hero_cta_3_url} variant="ghost" size="lg" className="!text-ivory hover:!bg-white/10">
              {settings.hero_cta_3_text}
            </LinkButton>
          </div>
        </div>
      </section>

      <GoldRateBar rates={goldRates} disclaimer={settings.gold_rate_disclaimer} />

      {/* Featured Collections */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Explore" title="Featured Collections" description="Curated jewelry collections for every occasion, crafted with tradition and elegance." />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {collections.slice(0, 8).map((c) => (
            <CollectionCard key={c.id} name={c.name} slug={c.slug} description={c.description} imageUrl={c.image_url} productCount={collectionCounts[c.id] ?? 0} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <LinkButton href="/collections" variant="outline">View All Collections</LinkButton>
        </div>
      </section>

      {/* Featured Products */}
      {featured.products.length > 0 && (
        <section className="bg-ivory-dark/40 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Handpicked" title="Featured Products" description="A selection of our finest pieces, chosen for their exceptional craftsmanship." />
            <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {featured.products.map((p) => <ProductCard key={p.id} product={p} activeRates={activeRates} />)}
            </div>
            <div className="mt-10 text-center">
              <LinkButton href="/products?featured=1" variant="outline">View All Featured Products</LinkButton>
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Just In" title="New Arrivals" description="The latest additions to the Zarghoon Jewellers collection." />
          <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {newArrivals.products.map((p) => <ProductCard key={p.id} product={p} activeRates={activeRates} />)}
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="bg-charcoal py-20 text-ivory">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Our Promise" title="Why Choose Zarghoon Jewellers" />
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_US.map((item) => (
              <div key={item.title} className="flex gap-4">
                <item.icon className="mt-1 shrink-0 text-gold" size={24} strokeWidth={1.5} />
                <div>
                  <h3 className="font-serif text-lg">{item.title}</h3>
                  <p className="mt-1 text-sm text-ivory/60">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom Jewelry */}
      <section id="custom-orders" className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Made For You" title="Request Custom Jewelry" description={settings.custom_order_info} />
        <div className="mt-10 rounded-sm border border-charcoal/10 bg-white p-6 shadow-sm sm:p-10">
          <CustomOrderForm />
        </div>
        <div className="mt-6 text-center">
          <a href={buildWhatsAppUrl(settings.whatsapp_number, genericInquiryMessage())} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gold-dark underline">
            Or start a custom order request on WhatsApp
          </a>
        </div>
      </section>

      {/* Showroom */}
      <section className="bg-ivory-dark/50 py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionHeading align="left" eyebrow="Visit Us" title="Our Showroom" />
            <div className="mt-6 space-y-4 text-sm text-charcoal/70">
              <p className="flex items-start gap-2"><MapPin size={18} className="mt-0.5 shrink-0 text-gold-dark" /> {settings.business_name}, {settings.address_line1}, {settings.address_line2}</p>
              <p className="flex items-start gap-2"><Phone size={18} className="mt-0.5 shrink-0 text-gold-dark" /> {settings.phone_number}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-xs text-charcoal/50">
                {hours.map((h) => (
                  <div key={h.id} className="flex justify-between">
                    <span>{DAY_NAMES[h.day_of_week]}</span>
                    <span>{h.is_closed ? "Closed" : `${h.open_time?.slice(0, 5)}–${h.close_time?.slice(0, 5)}`}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`tel:${settings.phone_number}`} className="inline-flex items-center gap-2 rounded-sm border border-charcoal px-5 py-2.5 text-sm font-medium text-charcoal hover:bg-charcoal hover:text-ivory">
                <Phone size={16} /> Call Now
              </a>
              <a href={buildWhatsAppUrl(settings.whatsapp_number, genericInquiryMessage())} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-sm bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1ebe57]">
                WhatsApp
              </a>
              {settings.google_maps_link && (
                <a href={settings.google_maps_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-sm bg-gold px-5 py-2.5 text-sm font-medium text-black hover:bg-gold-light">
                  <Navigation size={16} /> Get Directions
                </a>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-sm border border-charcoal/10 shadow-sm">
            {settings.google_maps_embed_url ? (
              <iframe
                src={settings.google_maps_embed_url}
                width="100%"
                height="100%"
                style={{ minHeight: 360, border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Zarghoon Jewellers showroom location"
              />
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center bg-ivory-dark text-sm text-charcoal/40">
                Map will appear here once configured in admin settings.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonialsToShow.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Testimonials" title="What Our Customers Say" />
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonialsToShow.map((t) => <TestimonialCard key={t.id} testimonial={t} />)}
          </div>
        </section>
      )}

      <section className="border-t border-charcoal/10 bg-charcoal py-4 text-center text-xs text-ivory/40">
        <Link href="/products" className="hover:text-ivory">Browse the full catalog →</Link>
      </section>
    </div>
  );
}
