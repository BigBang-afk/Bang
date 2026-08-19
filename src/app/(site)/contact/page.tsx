import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { getSettings } from "@/lib/site-data";
import { ContactWhatsAppForm } from "@/components/site/ContactWhatsAppForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Visit Zarghoon Jewellers at Liaquat Bazar Sarafa Market, Quetta, or reach us by phone and WhatsApp.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dark">Get in Touch</p>
        <h1 className="mt-2 font-display text-4xl text-maroon">Contact Us</h1>
        <div className="gold-divider mx-auto my-6 w-32" />
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <div>
          <div className="space-y-5">
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-gold-dark" />
              <div>
                <p className="font-medium text-brown">Visit Our Showroom</p>
                <p className="text-sm text-brown-light">{settings.address}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="h-5 w-5 shrink-0 text-gold-dark" />
              <div>
                <p className="font-medium text-brown">Opening Hours</p>
                <p className="text-sm text-brown-light">{settings.openingHours}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Phone className="h-5 w-5 shrink-0 text-gold-dark" />
              <div>
                <p className="font-medium text-brown">Call Us</p>
                <a href={`tel:${settings.phone}`} className="text-sm text-brown-light hover:text-maroon">
                  {settings.phone}
                </a>
              </div>
            </div>
            <div className="flex gap-3">
              <Mail className="h-5 w-5 shrink-0 text-gold-dark" />
              <div>
                <p className="font-medium text-brown">Email Us</p>
                <a href={`mailto:${settings.email}`} className="text-sm text-brown-light hover:text-maroon">
                  {settings.email}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 aspect-video overflow-hidden rounded-sm border border-gold/20">
            <iframe
              title="Zarghoon Jewellers location"
              className="h-full w-full"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=66.97%2C30.17%2C67.03%2C30.22&layer=mapnik&marker=30.1978%2C67.0011`}
            />
          </div>
        </div>

        <div className="rounded-sm border border-gold/20 bg-ivory p-8">
          <h2 className="font-display text-2xl text-maroon">Send Us a Message</h2>
          <p className="mt-2 text-sm text-brown-light">
            We&apos;ll open WhatsApp with your message pre-filled so our team can respond quickly.
          </p>
          <ContactWhatsAppForm whatsapp={settings.whatsapp} />
        </div>
      </div>
    </div>
  );
}
