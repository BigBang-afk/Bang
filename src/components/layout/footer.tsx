import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MapPin } from "lucide-react";
import { buildWhatsAppUrl, genericInquiryMessage } from "@/lib/whatsapp";
import type { BusinessHour, Category, SocialLink, WebsiteSettings } from "@/types/database";

const PLATFORM_ICON: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Footer({
  settings,
  categories,
  hours,
  socialLinks,
}: {
  settings: WebsiteSettings;
  categories: Category[];
  hours: BusinessHour[];
  socialLinks: SocialLink[];
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-charcoal/10 bg-charcoal text-ivory">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              {settings.logo_url ? (
                <Image src={settings.logo_url} alt={settings.business_name} width={36} height={36} className="h-9 w-9 object-contain" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold text-gold">
                  <span className="font-serif text-lg">Z</span>
                </span>
              )}
              <span className="font-serif text-lg">{settings.business_name}</span>
            </div>
            <p className="text-sm leading-relaxed text-ivory/70">{settings.footer_about}</p>
            {socialLinks.length > 0 && (
              <div className="mt-4 flex gap-3">
                {socialLinks.map((link) => {
                  const Icon = PLATFORM_ICON[link.platform.toLowerCase()] ?? Facebook;
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.platform}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-ivory/70 transition-colors hover:border-gold hover:text-gold"
                    >
                      <Icon size={15} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-4 text-xs uppercase tracking-widest text-gold">Quick Links</h3>
            <ul className="space-y-2.5 text-sm text-ivory/70">
              <li><Link href="/" className="hover:text-ivory">Home</Link></li>
              <li><Link href="/collections" className="hover:text-ivory">Collections</Link></li>
              <li><Link href="/products" className="hover:text-ivory">All Products</Link></li>
              <li><Link href="/gold-rates" className="hover:text-ivory">Gold Rates</Link></li>
              <li><Link href="/gold-calculator" className="hover:text-ivory">Gold Calculator</Link></li>
              <li><Link href="/custom-orders" className="hover:text-ivory">Custom Orders</Link></li>
              <li><Link href="/about" className="hover:text-ivory">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-ivory">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs uppercase tracking-widest text-gold">Categories</h3>
            <ul className="space-y-2.5 text-sm text-ivory/70">
              {categories.slice(0, 8).map((c) => (
                <li key={c.id}><Link href={`/collections/${c.slug}`} className="hover:text-ivory">{c.name}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs uppercase tracking-widest text-gold">Visit Our Showroom</h3>
            <ul className="space-y-3 text-sm text-ivory/70">
              <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-gold" /> {settings.address_line1}, {settings.address_line2}</li>
              <li className="flex gap-2"><Phone size={16} className="mt-0.5 shrink-0 text-gold" /> <a href={`tel:${settings.phone_number}`} className="hover:text-ivory">{settings.phone_number}</a></li>
              <li className="flex gap-2">
                <Mail size={16} className="mt-0.5 shrink-0 text-gold" /> <a href={`mailto:${settings.email}`} className="hover:text-ivory">{settings.email}</a>
              </li>
              <li>
                <a
                  href={buildWhatsAppUrl(settings.whatsapp_number, genericInquiryMessage())}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-block rounded-sm bg-[#25D366] px-4 py-2 text-xs font-medium text-white"
                >
                  WhatsApp Us
                </a>
              </li>
            </ul>
            {hours.length > 0 && (
              <div className="mt-4 space-y-1 text-xs text-ivory/50">
                {hours.map((h) => (
                  <div key={h.id} className="flex justify-between gap-4">
                    <span>{DAY_NAMES[h.day_of_week]}</span>
                    <span>{h.is_closed ? "Closed" : `${h.open_time?.slice(0, 5)} – ${h.close_time?.slice(0, 5)}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-ivory/50">
          <p className="mb-2">{settings.gold_rate_disclaimer}</p>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p>© {year} {settings.business_name}. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/privacy-policy" className="hover:text-ivory">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-ivory">Terms &amp; Conditions</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
