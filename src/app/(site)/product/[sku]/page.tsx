import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { priceProduct } from "@/lib/gold";
import { getSettings } from "@/lib/site-data";
import { getCustomerSession } from "@/lib/auth-customer";
import { formatPkr, formatWeight, formatDateTime, purityLabel } from "@/lib/format";
import { buildWhatsAppLink, productInquiryMessage } from "@/lib/whatsapp";
import { ProductImageGallery } from "@/components/site/ProductImageGallery";
import { WishlistButton } from "@/components/site/WishlistButton";
import { ShareButton } from "@/components/site/ShareButton";
import { ProductCard } from "@/components/site/ProductCard";
import { MessageCircle } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/product/[sku]">): Promise<Metadata> {
  const { sku } = await params;
  const product = await prisma.product.findUnique({ where: { sku }, include: { images: true } });
  if (!product) return {};
  return {
    title: product.name,
    description: product.description ?? `${product.name} — ${purityLabel(product.purity)} gold jewellery from Zarghoon Jewellers.`,
    alternates: { canonical: `/product/${sku}` },
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.images[0] ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps<"/product/[sku]">) {
  const { sku } = await params;

  const product = await prisma.product.findUnique({
    where: { sku },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
  });
  if (!product || product.status !== "PUBLISHED") notFound();

  prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const [price, settings, session, related] = await Promise.all([
    priceProduct(product),
    getSettings(),
    getCustomerSession(),
    prisma.product.findMany({
      where: { categoryId: product.categoryId, status: "PUBLISHED", NOT: { id: product.id } },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      take: 4,
    }),
  ]);

  let inWishlist = false;
  if (session) {
    const wl = await prisma.wishlist.findUnique({
      where: { customerId_productId: { customerId: session.customerId, productId: product.id } },
    });
    inWishlist = Boolean(wl);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.description ?? undefined,
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: settings.businessName },
    offers: price.available
      ? {
          "@type": "Offer",
          priceCurrency: "PKR",
          price: price.breakdown.finalPrice,
          availability:
            product.stockStatus === "IN_STOCK"
              ? "https://schema.org/InStock"
              : product.stockStatus === "MADE_TO_ORDER"
                ? "https://schema.org/PreOrder"
                : "https://schema.org/OutOfStock",
        }
      : undefined,
  };

  const relatedPriced = await Promise.all(
    related.map(async (p) => ({ ...p, price: await priceProduct(p) })),
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-brown-light">
        <Link href="/collections" className="hover:text-maroon">Collections</Link> /{" "}
        <Link href={`/collections/${product.category.slug}`} className="hover:text-maroon">{product.category.name}</Link> /{" "}
        {product.name}
      </nav>

      <div className="mt-6 grid gap-12 lg:grid-cols-2">
        <ProductImageGallery images={product.images} productName={product.name} />

        <div>
          <p className="text-xs uppercase tracking-wider text-gold-dark">{product.category.name}</p>
          <h1 className="mt-1 font-display text-3xl text-maroon">{product.name}</h1>
          <p className="mt-1 text-sm text-brown-light">SKU: {product.sku}</p>

          <div className="mt-6 flex flex-wrap gap-6 border-y border-gold/20 py-5 text-sm">
            <div>
              <p className="text-brown-light">Purity</p>
              <p className="font-medium text-brown">{purityLabel(product.purity)}</p>
            </div>
            <div>
              <p className="text-brown-light">Gross Weight</p>
              <p className="font-medium text-brown">{formatWeight(product.grossWeight)}</p>
            </div>
            <div>
              <p className="text-brown-light">Net Gold Weight</p>
              <p className="font-medium text-brown">{formatWeight(product.netGoldWeight)}</p>
            </div>
            {Number(product.stoneWeight) > 0 && (
              <div>
                <p className="text-brown-light">Stone Weight</p>
                <p className="font-medium text-brown">{formatWeight(product.stoneWeight)}</p>
              </div>
            )}
            <div>
              <p className="text-brown-light">Availability</p>
              <p className="font-medium text-brown">
                {product.stockStatus === "IN_STOCK" ? "In Stock" : product.stockStatus === "MADE_TO_ORDER" ? "Made to Order" : "Out of Stock"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            {price.available ? (
              <>
                <p className="font-display text-4xl font-semibold text-maroon">{formatPkr(price.breakdown.finalPrice)}</p>
                <p className="mt-1 text-xs text-brown-light">
                  Price calculated using today&apos;s gold rate — {formatPkr(price.ratePerGram, 0)}/g ({purityLabel(product.purity)})
                  {price.effectiveAt && ` · Updated ${formatDateTime(price.effectiveAt)}`}
                </p>
                {settings.pricingUsesExtras && (
                  <dl className="mt-4 space-y-1.5 rounded-sm border border-gold/15 bg-cream-dark/40 p-4 text-sm">
                    <Row label="Gold Value" value={formatPkr(price.breakdown.goldValue)} />
                    {price.breakdown.makingCharges > 0 && <Row label="Making Charges" value={formatPkr(price.breakdown.makingCharges)} />}
                    {price.breakdown.stoneCharges > 0 && <Row label="Stone Charges" value={formatPkr(price.breakdown.stoneCharges)} />}
                    {price.breakdown.otherCharges > 0 && <Row label="Other Charges" value={formatPkr(price.breakdown.otherCharges)} />}
                    {price.breakdown.discount > 0 && <Row label="Discount" value={`- ${formatPkr(price.breakdown.discount)}`} />}
                    {price.breakdown.taxAmount > 0 && <Row label={`Tax (${price.breakdown.taxPercent}%)`} value={formatPkr(price.breakdown.taxAmount)} />}
                    <div className="gold-divider my-1" />
                    <Row label="Final Price" value={formatPkr(price.breakdown.finalPrice)} bold />
                  </dl>
                )}
              </>
            ) : (
              <p className="text-brown-light italic">{price.reason} Please contact us for pricing.</p>
            )}
          </div>

          {product.description && <p className="mt-6 leading-relaxed text-brown-light">{product.description}</p>}

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={buildWhatsAppLink(settings.whatsapp, productInquiryMessage(product.name, product.sku))}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-sm bg-[#25D366] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
            </a>
            <WishlistButtonInline productId={product.id} inWishlist={inWishlist} />
            <ShareButton title={product.name} />
          </div>
        </div>
      </div>

      {relatedPriced.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl text-maroon">You May Also Like</h2>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {relatedPriced.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-maroon" : "text-brown-light"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function WishlistButtonInline({ productId, inWishlist }: { productId: string; inWishlist: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-cream-dark py-1 pl-1 pr-4">
      <WishlistButton productId={productId} initiallyWishlisted={inWishlist} />
      <span className="text-sm text-brown-light">Wishlist</span>
    </div>
  );
}
