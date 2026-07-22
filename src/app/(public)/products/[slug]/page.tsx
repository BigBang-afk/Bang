import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPrice } from "@/components/product/product-price";
import { ProductWhatsAppButton } from "@/components/product/product-whatsapp-button";
import { ShareButtons } from "@/components/product/share-buttons";
import { InquiryForm } from "@/components/product/inquiry-form";
import { ProductCard } from "@/components/product/product-card";
import { RecentlyViewedTracker, RecentlyViewedList } from "@/components/product/recently-viewed";
import { Badge } from "@/components/ui/badge";
import { getProductBySlug, getRelatedProducts } from "@/lib/data/products";
import { getActiveRateMap } from "@/lib/data/gold-rates";
import { getWebsiteSettings } from "@/lib/data/settings";
import { computeProductPrice } from "@/lib/pricing/compute";
import { AVAILABILITY_LABELS } from "@/lib/constants";
import { formatDateTime, formatWeight } from "@/lib/utils";
import { trackProductViewAction } from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const title = product.seo_title || `${product.name} — ${product.product_code}`;
  const description = product.seo_description || product.description?.slice(0, 160) || `${product.name} in ${product.purity} gold, available at Zarghoon Jewellers, Quetta.`;

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title,
      description,
      images: product.cover_image_url ? [{ url: product.cover_image_url }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, activeRates, settings] = await Promise.all([
    getProductBySlug(slug),
    getActiveRateMap(),
    getWebsiteSettings(),
  ]);

  if (!product) notFound();

  void trackProductViewAction(product.id);

  const price = computeProductPrice(product, activeRates);
  const related = await getRelatedProducts(product, 4);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const productUrl = `${siteUrl}/products/${product.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((i) => i.image_url),
    description: product.description ?? undefined,
    sku: product.product_code,
    brand: { "@type": "Brand", name: settings.business_name },
    ...(price.visible
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "PKR",
            price: price.finalPrice,
            availability: product.availability_status === "in_stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: productUrl,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RecentlyViewedTracker
        entry={{
          slug: product.slug,
          name: product.name,
          image: product.cover_image_url ?? "/placeholder-product.svg",
          price: price.visible ? price.finalPrice : null,
          priceLabel: price.visible ? null : price.label,
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-charcoal/50">
        <Link href="/" className="hover:text-charcoal">Home</Link> /{" "}
        <Link href="/products" className="hover:text-charcoal">All Products</Link> /{" "}
        {product.category && <><Link href={`/collections/${product.category.slug}`} className="hover:text-charcoal">{product.category.name}</Link> / </>}
        <span className="text-charcoal">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {product.is_featured && <Badge tone="gold">Featured</Badge>}
            {product.is_new_arrival && <Badge tone="charcoal">New Arrival</Badge>}
            {product.availability_status !== "in_stock" && (
              <Badge tone={product.availability_status === "sold" ? "red" : "amber"}>{AVAILABILITY_LABELS[product.availability_status]}</Badge>
            )}
          </div>
          <p className="text-xs uppercase tracking-wide text-charcoal/40">{product.category?.name} · {product.product_code}</p>
          <h1 className="mt-1 font-serif text-3xl text-charcoal">{product.name}</h1>

          <div className="mt-3 flex gap-6 text-sm text-charcoal/60">
            <span>Purity: <strong className="text-charcoal">{product.purity}</strong></span>
            <span>Gross Weight: <strong className="text-charcoal">{formatWeight(product.gross_weight_grams)}</strong></span>
          </div>

          <div className="mt-5 rounded-sm bg-ivory-dark/50 p-4">
            <ProductPrice price={price} size="lg" />
            {price.visible && price.isEstimate && price.rateEffectiveAt && (
              <p className="mt-1 text-xs text-charcoal/50">Gold rate as of {formatDateTime(price.rateEffectiveAt)}</p>
            )}
            <p className="mt-2 text-xs italic text-charcoal/50">{settings.product_price_disclaimer}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <ProductWhatsAppButton product={product} price={price} whatsappNumber={settings.whatsapp_number} />
            <a href={`tel:${settings.phone_number}`} className="inline-flex items-center gap-2 rounded-sm border border-charcoal px-5 py-2.5 text-sm font-medium text-charcoal hover:bg-charcoal hover:text-ivory">
              <Phone size={16} /> Call Now
            </a>
            <ShareButtons url={productUrl} title={product.name} />
          </div>

          {product.description && (
            <div className="mt-6 border-t border-charcoal/10 pt-6">
              <h2 className="mb-2 font-serif text-lg">Description</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal/70">{product.description}</p>
            </div>
          )}

          <div className="mt-6 border-t border-charcoal/10 pt-6">
            <h2 className="mb-3 font-serif text-lg">Send an Inquiry</h2>
            <InquiryForm productId={product.id} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-serif text-2xl text-charcoal">Related Products</h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} activeRates={activeRates} />)}
          </div>
        </section>
      )}

      <section className="mt-16">
        <RecentlyViewedList excludeSlug={product.slug} />
      </section>
    </div>
  );
}
