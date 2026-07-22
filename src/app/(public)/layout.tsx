import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFloatButton } from "@/components/layout/whatsapp-float-button";
import { getWebsiteSettings, getBusinessHours, getSocialLinks } from "@/lib/data/settings";
import { listCategories } from "@/lib/data/categories";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, hours, socialLinks] = await Promise.all([
    getWebsiteSettings(),
    listCategories(true),
    getBusinessHours(),
    getSocialLinks(true),
  ]);

  return (
    <>
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
