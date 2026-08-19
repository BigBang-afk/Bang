import Link from "next/link";
import { MapPin, Clock, Phone } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { FacebookIcon, InstagramIcon, YoutubeIcon } from "@/components/icons/SocialIcons";

interface TopBarProps {
  address: string;
  openingHours: string;
  phone: string;
  whatsapp: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
}

export function TopBar(props: TopBarProps) {
  return (
    <div className="hidden bg-maroon-dark text-cream/90 md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-xs">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gold" /> {props.address}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gold" /> {props.openingHours}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a href={`tel:${props.phone}`} className="flex items-center gap-1.5 hover:text-gold">
            <Phone className="h-3.5 w-3.5 text-gold" /> {props.phone}
          </a>
          <a
            href={buildWhatsAppLink(props.whatsapp, "Hello Zarghoon Jewellers, I'd like to know more.")}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gold"
          >
            WhatsApp
          </a>
          <div className="flex items-center gap-3">
            {props.facebookUrl && (
              <Link href={props.facebookUrl} target="_blank" aria-label="Facebook" className="hover:text-gold">
                <FacebookIcon className="h-3.5 w-3.5" />
              </Link>
            )}
            {props.instagramUrl && (
              <Link href={props.instagramUrl} target="_blank" aria-label="Instagram" className="hover:text-gold">
                <InstagramIcon className="h-3.5 w-3.5" />
              </Link>
            )}
            {props.youtubeUrl && (
              <Link href={props.youtubeUrl} target="_blank" aria-label="YouTube" className="hover:text-gold">
                <YoutubeIcon className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
