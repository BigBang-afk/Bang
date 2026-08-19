import { getSettings } from "@/lib/site-data";
import { getCustomerSession } from "@/lib/auth-customer";
import { TopBar } from "@/components/site/TopBar";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [settings, session] = await Promise.all([getSettings(), getCustomerSession()]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JewelryStore",
    name: settings.businessName,
    image: settings.logoUrl ?? undefined,
    url: siteUrl,
    telephone: settings.phone,
    email: settings.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      addressLocality: "Quetta",
      addressCountry: "PK",
    },
    openingHours: settings.openingHours,
    sameAs: [settings.facebookUrl, settings.instagramUrl, settings.youtubeUrl, settings.tiktokUrl].filter(
      Boolean,
    ),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TopBar
        address={settings.address}
        openingHours={settings.openingHours}
        phone={settings.phone}
        whatsapp={settings.whatsapp}
        facebookUrl={settings.facebookUrl}
        instagramUrl={settings.instagramUrl}
        youtubeUrl={settings.youtubeUrl}
        tiktokUrl={settings.tiktokUrl}
      />
      <Navbar businessName={settings.businessName} isLoggedIn={Boolean(session)} />
      <main className="flex-1">{children}</main>
      <Footer
        businessName={settings.businessName}
        address={settings.address}
        phone={settings.phone}
        whatsapp={settings.whatsapp}
        email={settings.email}
        openingHours={settings.openingHours}
        facebookUrl={settings.facebookUrl}
        instagramUrl={settings.instagramUrl}
        youtubeUrl={settings.youtubeUrl}
      />
      <WhatsAppFloat whatsapp={settings.whatsapp} />
    </>
  );
}
