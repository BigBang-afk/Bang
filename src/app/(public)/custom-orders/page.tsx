import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/section-heading";
import { CustomOrderForm } from "@/components/home/custom-order-form";
import { getWebsiteSettings } from "@/lib/data/settings";
import { buildWhatsAppUrl, customOrderMessage } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Custom Jewelry Orders",
  description: "Request a custom-designed gold jewelry piece from Zarghoon Jewellers in Quetta — bridal sets, rings, necklaces and more, made to your vision.",
};

export default async function CustomOrdersPage() {
  const settings = await getWebsiteSettings();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Made For You" title="Custom Jewelry Orders" description={settings.custom_order_info} />

      <div className="mt-10 rounded-sm border border-charcoal/10 bg-white p-6 shadow-sm sm:p-10">
        <CustomOrderForm />
      </div>

      <div className="mt-8 text-center">
        <a
          href={buildWhatsAppUrl(settings.whatsapp_number, customOrderMessage())}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-sm bg-[#25D366] px-6 py-3 text-sm font-medium text-white hover:bg-[#1ebe57]"
        >
          Or Start a Custom Order on WhatsApp
        </a>
      </div>
    </div>
  );
}
