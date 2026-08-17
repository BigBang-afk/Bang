"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { GOLD_PURITIES, PURITY_LABELS, type GoldPurity } from "@/types/gold";
import { upsertCustomerPreferenceAction } from "@/lib/actions/customers.actions";

export type PreferenceFormValue = {
  preferredCategories: string[];
  preferredPurity: GoldPurity | null;
  preferredMetal: string;
  preferredPriceRangeMin: string;
  preferredPriceRangeMax: string;
  preferredContactMethod: string;
  notes: string;
};

export function PreferencesForm({
  customerId,
  initial,
}: {
  customerId: string;
  initial: PreferenceFormValue;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initial.preferredCategories.join(", "));
  const [purity, setPurity] = useState<string>(initial.preferredPurity ?? "NONE");
  const [metal, setMetal] = useState(initial.preferredMetal);
  const [priceMin, setPriceMin] = useState(initial.preferredPriceRangeMin);
  const [priceMax, setPriceMax] = useState(initial.preferredPriceRangeMax);
  const [contactMethod, setContactMethod] = useState(initial.preferredContactMethod);
  const [notes, setNotes] = useState(initial.notes);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await upsertCustomerPreferenceAction({
        customerId,
        preferredCategories: categories
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        preferredPurity: purity === "NONE" ? null : purity,
        preferredMetal: metal || undefined,
        preferredPriceRangeMin: priceMin ? Number(priceMin) : undefined,
        preferredPriceRangeMax: priceMax ? Number(priceMax) : undefined,
        preferredContactMethod: contactMethod || undefined,
        notes: notes || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Preferences saved.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="pref-categories">Preferred Categories (comma separated)</Label>
        <Input
          id="pref-categories"
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          placeholder="Rings, Bridal Sets"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pref-purity">Preferred Purity</Label>
        <Select value={purity} onValueChange={setPurity}>
          <SelectTrigger id="pref-purity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">No preference</SelectItem>
            {GOLD_PURITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PURITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pref-metal">Preferred Metal</Label>
        <Input id="pref-metal" value={metal} onChange={(e) => setMetal(e.target.value)} placeholder="Gold, Silver, Platinum" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pref-price-min">Min Price Range</Label>
        <Input id="pref-price-min" type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pref-price-max">Max Price Range</Label>
        <Input id="pref-price-max" type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pref-contact-method">Preferred Contact Method</Label>
        <Input
          id="pref-contact-method"
          value={contactMethod}
          onChange={(e) => setContactMethod(e.target.value)}
          placeholder="WhatsApp, Phone, Email"
        />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="pref-notes">Notes</Label>
        <Input
          id="pref-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Prefers 21K gold, usually buys bridal sets..."
        />
      </div>
      <Button onClick={handleSave} disabled={pending} className="sm:col-span-2 sm:w-fit">
        {pending ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  );
}
