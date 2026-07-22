import type { Metadata } from "next";
import { Phone, Mail, MapPin, Navigation } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { ContactForm } from "./contact-form";
import { getWebsiteSettings, getBusinessHours } from "@/lib/data/settings";
import { buildWhatsAppUrl, genericInquiryMessage } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Zarghoon Jewellers in Liaquat Bazar, Sarafa Market, Quetta — call, WhatsApp, or visit our showroom.",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function ContactPage() {
  const [settings, hours] = await Promise.all([getWebsiteSettings(), getBusinessHours()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Get in Touch" title="Contact Zarghoon Jewellers" description="We're happy to help with product questions, custom orders, or a showroom visit." />

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="space-y-4 text-sm text-charcoal/70">
            <p className="flex items-start gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-gold-dark" /> {settings.business_name}, {settings.address_line1}, {settings.address_line2}</p>
            <p className="flex items-start gap-3"><Phone size={18} className="mt-0.5 shrink-0 text-gold-dark" /> <a href={`tel:${settings.phone_number}`} className="hover:text-charcoal">{settings.phone_number}</a></p>
            <p className="flex items-start gap-3"><Mail size={18} className="mt-0.5 shrink-0 text-gold-dark" /> <a href={`mailto:${settings.email}`} className="hover:text-charcoal">{settings.email}</a></p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-charcoal/50">
            {hours.map((h) => (
              <div key={h.id} className="flex justify-between border-b border-charcoal/5 py-1.5">
                <span>{DAY_NAMES[h.day_of_week]}</span>
                <span>{h.is_closed ? "Closed" : `${h.open_time?.slice(0, 5)} – ${h.close_time?.slice(0, 5)}`}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
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

          {settings.google_maps_embed_url && (
            <div className="mt-8 overflow-hidden rounded-sm border border-charcoal/10">
              <iframe src={settings.google_maps_embed_url} width="100%" height="280" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Zarghoon Jewellers location" />
            </div>
          )}
        </div>

        <div className="rounded-sm border border-charcoal/10 bg-white p-6 shadow-sm sm:p-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
