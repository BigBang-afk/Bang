"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Deep-links to WhatsApp Web/App with a pre-filled message — this is the
 * "WhatsApp-ready" architecture the spec asks for, not automation. Sending
 * still requires the staff member to tap Send inside WhatsApp themselves.
 * See SALES.md "WhatsApp-ready invoice sharing".
 */
export function WhatsAppShareButton({
  phone,
  message,
}: {
  phone: string | null;
  message: string;
}) {
  const digits = phone?.replace(/[^0-9]/g, "") ?? "";

  if (!digits) {
    return (
      <Button variant="outline" size="sm" disabled title="No customer phone number on this sale">
        <MessageCircle className="size-4" />
        WhatsApp
      </Button>
    );
  }

  const href = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

  return (
    <Button variant="outline" size="sm" asChild className="print:hidden">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-4" />
        WhatsApp
      </a>
    </Button>
  );
}
