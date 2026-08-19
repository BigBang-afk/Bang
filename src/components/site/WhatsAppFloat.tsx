import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export function WhatsAppFloat({ whatsapp }: { whatsapp: string }) {
  return (
    <a
      href={buildWhatsAppLink(whatsapp, "Hello Zarghoon Jewellers, I'd like to know more.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform hover:scale-105"
    >
      <MessageCircle className="h-7 w-7" fill="white" />
    </a>
  );
}
