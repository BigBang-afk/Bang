"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitCustomOrderAction, type CustomOrderState } from "@/app/(public)/custom-orders/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { HONEYPOT_FIELD } from "@/lib/validations/forms";
import { GOLD_PURITIES, CONTACT_METHODS } from "@/lib/constants";

const initialState: CustomOrderState = {};

export function CustomOrderForm() {
  const [state, formAction, isPending] = useActionState(submitCustomOrderAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4" encType="multipart/form-data">
      {/* Honeypot — hidden from real users, bots often fill every field. */}
      <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="customer_name" required>Full Name</Label>
          <Input id="customer_name" name="customer_name" required maxLength={100} />
        </div>
        <div>
          <Label htmlFor="mobile_number" required>Mobile Number</Label>
          <Input id="mobile_number" name="mobile_number" required placeholder="03XX-XXXXXXX" />
        </div>
        <div>
          <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
          <Input id="whatsapp_number" name="whatsapp_number" placeholder="If different from mobile" />
        </div>
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="jewelry_type" required>Jewelry Type</Label>
          <Input id="jewelry_type" name="jewelry_type" required placeholder="e.g. Bridal Necklace Set" />
        </div>
        <div>
          <Label htmlFor="gold_purity">Preferred Gold Purity</Label>
          <Select id="gold_purity" name="gold_purity" defaultValue="">
            <option value="">Not sure yet</option>
            {GOLD_PURITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="approx_weight_grams">Approximate Weight (grams)</Label>
          <Input id="approx_weight_grams" name="approx_weight_grams" type="number" step="0.001" min="0" />
        </div>
        <div>
          <Label htmlFor="budget">Approximate Budget (PKR)</Label>
          <Input id="budget" name="budget" type="number" step="1" min="0" />
        </div>
        <div>
          <Label htmlFor="preferred_contact_method">Preferred Contact Method</Label>
          <Select id="preferred_contact_method" name="preferred_contact_method" defaultValue="whatsapp">
            {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="required_date">Required Date</Label>
          <Input id="required_date" name="required_date" type="date" />
        </div>
      </div>

      <div>
        <Label htmlFor="design_description">Design Description</Label>
        <Textarea id="design_description" name="design_description" placeholder="Describe the design you have in mind…" />
      </div>

      <div>
        <Label htmlFor="reference_image_file">Reference Image (optional)</Label>
        <input
          id="reference_image_file"
          name="reference_image_file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-charcoal/70 file:mr-3 file:rounded-sm file:border-0 file:bg-charcoal file:px-4 file:py-2 file:text-xs file:font-medium file:text-ivory"
        />
      </div>

      <div>
        <Label htmlFor="additional_notes">Additional Notes</Label>
        <Textarea id="additional_notes" name="additional_notes" rows={2} />
      </div>

      {state.error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p role="status" className="rounded-sm border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}

      <Button type="submit" variant="gold" disabled={isPending}>
        {isPending ? "Submitting…" : "Submit Custom Order Request"}
      </Button>
    </form>
  );
}
