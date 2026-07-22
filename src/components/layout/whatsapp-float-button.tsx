"use client";

import { MessageCircle } from "lucide-react";
import { buildWhatsAppUrl, genericInquiryMessage } from "@/lib/whatsapp";

export function WhatsAppFloatButton({ whatsappNumber }: { whatsappNumber: string }) {
  return (
    <a
      href={buildWhatsAppUrl(whatsappNumber, genericInquiryMessage())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Zarghoon Jewellers on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 sm:bottom-8 sm:right-8"
    >
      <MessageCircle size={28} strokeWidth={1.75} />
    </a>
  );
}
