import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { FacebookIcon, InstagramIcon, YoutubeIcon } from "@/components/icons/SocialIcons";

interface FooterProps {
  businessName: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  openingHours: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
}

export function Footer(props: FooterProps) {
  return (
    <footer className="mt-auto bg-brown text-cream/80">
      <div className="gold-divider-thick" />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl text-gold">{props.businessName}</p>
          <p className="mt-3 text-sm leading-relaxed text-cream/70">
            Timeless gold. Trusted legacy. Crafting pure gold jewellery for generations of
            families across Quetta.
          </p>
          <div className="mt-4 flex gap-4">
            {props.facebookUrl && (
              <Link href={props.facebookUrl} target="_blank" className="text-cream/70 hover:text-gold">
                <FacebookIcon className="h-4 w-4" />
              </Link>
            )}
            {props.instagramUrl && (
              <Link href={props.instagramUrl} target="_blank" className="text-cream/70 hover:text-gold">
                <InstagramIcon className="h-4 w-4" />
              </Link>
            )}
            {props.youtubeUrl && (
              <Link href={props.youtubeUrl} target="_blank" className="text-cream/70 hover:text-gold">
                <YoutubeIcon className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        <div>
          <p className="font-display text-lg text-gold">Explore</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/collections" className="hover:text-gold">Collections</Link></li>
            <li><Link href="/gold-rate" className="hover:text-gold">Today&apos;s Gold Rate</Link></li>
            <li><Link href="/gallery" className="hover:text-gold">Gallery</Link></li>
            <li><Link href="/about" className="hover:text-gold">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-gold">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-display text-lg text-gold">Account</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/account" className="hover:text-gold">My Account</Link></li>
            <li><Link href="/account/wishlist" className="hover:text-gold">Wishlist</Link></li>
            <li><Link href="/register" className="hover:text-gold">Create Account</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-display text-lg text-gold">Visit Us</p>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-gold" /> {props.address}</li>
            <li className="flex gap-2"><Clock className="h-4 w-4 shrink-0 text-gold" /> {props.openingHours}</li>
            <li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-gold" /> {props.phone}</li>
            <li className="flex gap-2"><Mail className="h-4 w-4 shrink-0 text-gold" /> {props.email}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10 px-6 py-5 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} {props.businessName}. All rights reserved. · Liaquat Bazar Sarafa Market, Quetta
      </div>
    </footer>
  );
}
