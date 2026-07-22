import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFloatButton } from "@/components/layout/whatsapp-float-button";
import { SetupPending } from "@/components/layout/setup-pending";
import { getWebsiteSettings, getBusinessHours, getSocialLinks } from "@/lib/data/settings";
import { listCategories } from "@/lib/data/categories";

// Gold rates, product prices, and availability must always reflect the
// current database state, never a build-time snapshot — render every public
// page dynamically rather than statically caching stale prices.
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let settings, categories, hours, socialLinks;
  try {
    [settings, categories, hours, socialLinks] = await Promise.all([
      getWebsiteSettings(),
      listCategories(true),
      getBusinessHours(),
      getSocialLinks(true),
    ]);
  } catch {
    // Database not reachable yet (e.g. Supabase env vars still placeholders
    // right after deployment) — show a friendly holding page instead of a
    // hard 500, so the site is never simply "down" while it's being set up.
    return <SetupPending />;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JewelryStore",
    name: settings.business_name,
    description: settings.seo_default_description,
    url: siteUrl,
    telephone: settings.phone_number,
    email: settings.email,
    image: settings.logo_url ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address_line1,
      addressLocality: settings.address_line2,
      addressCountry: "PK",
    },
    openingHoursSpecification: hours
      .filter((h) => !h.is_closed && h.open_time && h.close_time)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: dayNames[h.day_of_week],
        opens: h.open_time?.slice(0, 5),
        closes: h.close_time?.slice(0, 5),
      })),
    sameAs: socialLinks.map((s) => s.url),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header
        businessName={settings.business_name}
        logoUrl={settings.logo_url}
        phoneNumber={settings.phone_number}
        whatsappNumber={settings.whatsapp_number}
        categories={categories}
      />
      <div className="flex-1">{children}</div>
      <Footer settings={settings} categories={categories} hours={hours} socialLinks={socialLinks} />
      <WhatsAppFloatButton whatsappNumber={settings.whatsapp_number} />
    </>
  );
}
