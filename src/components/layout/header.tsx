"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Search, ChevronDown, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl, genericInquiryMessage } from "@/lib/whatsapp";
import type { Category } from "@/types/database";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/collections", label: "Collections" },
  { href: "/products", label: "All Products" },
  { href: "/gold-rates", label: "Gold Rates" },
  { href: "/gold-calculator", label: "Gold Calculator" },
  { href: "/custom-orders", label: "Custom Orders" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

export function Header({
  businessName,
  logoUrl,
  phoneNumber,
  whatsappNumber,
  categories,
}: {
  businessName: string;
  logoUrl: string | null;
  phoneNumber: string;
  whatsappNumber: string;
  categories: Category[];
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-300",
        scrolled ? "border-charcoal/10 bg-ivory/95 shadow-sm backdrop-blur-md" : "border-transparent bg-ivory"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8",
          scrolled ? "py-2.5" : "py-4"
        )}
      >
        <Link href="/" className="flex items-center gap-2.5">
          {logoUrl ? (
            <Image src={logoUrl} alt={businessName} width={40} height={40} className="h-9 w-9 object-contain sm:h-10 sm:w-10" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold text-gold sm:h-10 sm:w-10">
              <span className="font-serif text-lg">Z</span>
            </span>
          )}
          <span className="font-serif text-lg tracking-wide text-charcoal sm:text-xl">{businessName}</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) =>
            link.href === "/collections" ? (
              <div
                key={link.href}
                className="relative"
                onMouseEnter={() => setCategoriesOpen(true)}
                onMouseLeave={() => setCategoriesOpen(false)}
              >
                <Link href={link.href} className="flex items-center gap-1 text-sm text-charcoal/80 transition-colors hover:text-gold-dark">
                  {link.label} <ChevronDown size={14} />
                </Link>
                {categoriesOpen && categories.length > 0 && (
                  <div className="absolute left-1/2 top-full w-64 -translate-x-1/2 pt-3">
                    <div className="rounded-sm border border-charcoal/10 bg-white p-2 shadow-xl">
                      {categories.map((c) => (
                        <Link
                          key={c.id}
                          href={`/collections/${c.slug}`}
                          className="block rounded-sm px-3 py-2 text-sm text-charcoal/80 hover:bg-ivory-dark hover:text-gold-dark"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link key={link.href} href={link.href} className="text-sm text-charcoal/80 transition-colors hover:text-gold-dark">
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/search" aria-label="Search products" className="rounded-full p-2 text-charcoal/70 transition-colors hover:bg-charcoal/5 hover:text-charcoal">
            <Search size={19} />
          </Link>
          <a
            href={`tel:${phoneNumber.replace(/[^0-9+]/g, "")}`}
            aria-label="Call Zarghoon Jewellers"
            className="hidden rounded-full p-2 text-charcoal/70 transition-colors hover:bg-charcoal/5 hover:text-charcoal sm:block"
          >
            <Phone size={18} />
          </a>
          <a
            href={buildWhatsAppUrl(whatsappNumber, genericInquiryMessage())}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-sm bg-[#25D366] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1ebe57] sm:inline-flex sm:items-center"
          >
            WhatsApp Us
          </a>
          <button
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-full p-2 text-charcoal lg:hidden"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 top-[var(--header-h,0)] z-40 flex flex-col bg-ivory lg:hidden" style={{ top: scrolled ? 60 : 72 }}>
          <nav className="flex flex-col gap-1 overflow-y-auto p-6" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="border-b border-charcoal/5 py-3.5 font-serif text-lg text-charcoal"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={buildWhatsAppUrl(whatsappNumber, genericInquiryMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 rounded-sm bg-[#25D366] px-5 py-3 text-center text-sm font-medium text-white"
            >
              WhatsApp Inquiry
            </a>
            <a href={`tel:${phoneNumber.replace(/[^0-9+]/g, "")}`} className="mt-3 rounded-sm border border-charcoal px-5 py-3 text-center text-sm font-medium text-charcoal">
              Call {phoneNumber}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
