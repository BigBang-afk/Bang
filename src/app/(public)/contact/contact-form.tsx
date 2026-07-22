"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContactMessageAction, type ContactState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { HONEYPOT_FIELD } from "@/lib/validations/forms";
import { CONTACT_METHODS } from "@/lib/constants";

const initialState: ContactState = {};

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactMessageAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" required>Name</Label>
          <Input id="name" name="name" required maxLength={100} />
        </div>
        <div>
          <Label htmlFor="mobile_number">Mobile Number</Label>
          <Input id="mobile_number" name="mobile_number" placeholder="03XX-XXXXXXX" />
        </div>
        <div>
          <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
          <Input id="whatsapp_number" name="whatsapp_number" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
      </div>

      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" maxLength={150} />
      </div>

      <div>
        <Label htmlFor="preferred_contact_method">Preferred Contact Method</Label>
        <Select id="preferred_contact_method" name="preferred_contact_method" defaultValue="whatsapp">
          {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
        </Select>
      </div>

      <div>
        <Label htmlFor="message" required>Message</Label>
        <Textarea id="message" name="message" required rows={5} />
      </div>

      {state.error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p role="status" className="rounded-sm border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}

      <Button type="submit" variant="gold" disabled={isPending}>
        {isPending ? "Sending…" : "Send Message"}
      </Button>
    </form>
  );
}
