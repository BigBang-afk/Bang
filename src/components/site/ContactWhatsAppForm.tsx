"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export function ContactWhatsAppForm({ whatsapp }: { whatsapp: string }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = `Hello Zarghoon Jewellers, my name is ${name || "—"}. ${message}`;
    window.open(buildWhatsAppLink(whatsapp, text), "_blank");
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <Input label="Your Name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Textarea
        label="Message"
        required
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="How can we help you?"
      />
      <Button type="submit">Send via WhatsApp</Button>
    </form>
  );
}
