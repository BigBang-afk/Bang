"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitProductInquiryAction, type InquiryState } from "@/app/(public)/products/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { HONEYPOT_FIELD } from "@/lib/validations/forms";

const initialState: InquiryState = {};

export function InquiryForm({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState(submitProductInquiryAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="product_id" value={productId} />
      <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="customer_name" required>Name</Label>
          <Input id="customer_name" name="customer_name" required maxLength={100} />
        </div>
        <div>
          <Label htmlFor="mobile_number" required>Mobile Number</Label>
          <Input id="mobile_number" name="mobile_number" required placeholder="03XX-XXXXXXX" />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email (optional)</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={3} placeholder="Ask about availability, sizing, or final price…" />
      </div>

      {state.error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p role="status" className="rounded-sm border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}

      <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
        {isPending ? "Sending…" : "Send Inquiry"}
      </Button>
    </form>
  );
}
