"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { slugify, formatPKR } from "@/lib/utils";
import { calculateProductPrice, type ActiveRateMap } from "@/lib/pricing/product-pricing";
import {
  GOLD_PURITIES, PRICING_METHODS, PRICING_METHOD_LABELS, DISCOUNT_TYPES, AVAILABILITY_STATUSES, AVAILABILITY_LABELS,
  type GoldPurity, type PricingMethod, type DiscountType,
} from "@/lib/constants";
import { generateProductCodeAction } from "@/app/admin/(protected)/products/actions";
import type { Category, Collection, ProductWithRelations } from "@/types/database";

interface ActionState {
  error?: string;
  success?: string;
}

export function ProductForm({
  action,
  categories,
  collections,
  activeRates,
  initial,
  submitLabel = "Save Product",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  collections: Collection[];
  activeRates: ActiveRateMap;
  initial?: ProductWithRelations;
  submitLabel?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [isGenerating, startGenerating] = useTransition();

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [code, setCode] = useState(initial?.product_code ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [purity, setPurity] = useState<GoldPurity>(initial?.purity ?? "22K");
  const [weight, setWeight] = useState(initial?.gross_weight_grams ?? "");
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>(initial?.pricing_method ?? "automatic");
  const [fixedPrice, setFixedPrice] = useState(initial?.fixed_price ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(initial?.discount_type ?? "none");
  const [discountValue, setDiscountValue] = useState(initial?.discount_value ?? "0");
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set(initial?.collections.map((c) => c.id) ?? [])
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state.error, state.success]);

  const pricePreview = useMemo(() => {
    const w = parseFloat(weight || "0");
    if (Number.isNaN(w)) return null;
    return calculateProductPrice(
      {
        purity,
        grossWeightGrams: w,
        pricingMethod,
        fixedPrice: fixedPrice ? parseFloat(fixedPrice) : null,
        discountType,
        discountValue: parseFloat(discountValue || "0"),
      },
      activeRates
    );
  }, [purity, weight, pricingMethod, fixedPrice, discountType, discountValue, activeRates]);

  const handleGenerateCode = () => {
    if (!categoryId) {
      toast.error("Select a category first.");
      return;
    }
    startGenerating(async () => {
      try {
        const generated = await generateProductCodeAction(categoryId);
        setCode(generated);
      } catch {
        toast.error("Failed to generate code.");
      }
    });
  };

  return (
    <form action={formAction} encType="multipart/form-data" className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-sm border border-charcoal/10 bg-white p-5">
          <h2 className="mb-4 font-serif text-lg">Basic Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name" required>Product Name</Label>
              <Input id="name" name="name" required value={name} onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }} />
            </div>
            <div>
              <Label htmlFor="slug" required>URL Slug</Label>
              <Input id="slug" name="slug" required value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
            </div>
            <div>
              <Label htmlFor="product_code" required>Product Code</Label>
              <div className="flex gap-2">
                <Input id="product_code" name="product_code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="uppercase" />
                <Button type="button" variant="outline" size="md" onClick={handleGenerateCode} disabled={isGenerating}>
                  <Wand2 size={15} />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="category_id" required>Category</Label>
              <Select id="category_id" name="category_id" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Select a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" name="gender" defaultValue={initial?.gender ?? "women"}>
                <option value="women">Women</option>
                <option value="men">Men</option>
                <option value="kids">Kids</option>
                <option value="unisex">Unisex</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="availability_status">Availability</Label>
              <Select id="availability_status" name="availability_status" defaultValue={initial?.availability_status ?? "in_stock"}>
                {AVAILABILITY_STATUSES.map((s) => <option key={s} value={s}>{AVAILABILITY_LABELS[s]}</option>)}
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={5} defaultValue={initial?.description ?? ""} />
          </div>

          <div className="mt-4">
            <Label>Collections</Label>
            <div className="flex flex-wrap gap-2">
              {collections.map((c) => {
                const checked = selectedCollections.has(c.id);
                return (
                  <label key={c.id} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors ${checked ? "border-gold bg-gold/15 text-gold-dark" : "border-charcoal/20 text-charcoal/60"}`}>
                    <input
                      type="checkbox" name="collection_ids" value={c.id} checked={checked} className="hidden"
                      onChange={() => {
                        setSelectedCollections((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                          return next;
                        });
                      }}
                    />
                    {c.name}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-charcoal/10 bg-white p-5">
          <h2 className="mb-4 font-serif text-lg">Pricing</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="purity" required>Gold Purity</Label>
              <Select id="purity" name="purity" required value={purity} onChange={(e) => setPurity(e.target.value as GoldPurity)}>
                {GOLD_PURITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="gross_weight_grams" required>Gross Weight (grams)</Label>
              <Input id="gross_weight_grams" name="gross_weight_grams" type="number" step="0.001" min="0" required
                value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="pricing_method" required>Pricing Method</Label>
              <Select id="pricing_method" name="pricing_method" required value={pricingMethod} onChange={(e) => setPricingMethod(e.target.value as PricingMethod)}>
                {PRICING_METHODS.map((m) => <option key={m} value={m}>{PRICING_METHOD_LABELS[m]}</option>)}
              </Select>
            </div>
            {pricingMethod === "fixed" && (
              <div>
                <Label htmlFor="fixed_price" required>Fixed Price (PKR)</Label>
                <Input id="fixed_price" name="fixed_price" type="number" step="0.01" min="0" required value={fixedPrice} onChange={(e) => setFixedPrice(e.target.value)} />
              </div>
            )}
            <div>
              <Label htmlFor="discount_type">Discount Type</Label>
              <Select id="discount_type" name="discount_type" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                {DISCOUNT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
            {discountType !== "none" && (
              <div>
                <Label htmlFor="discount_value">Discount Value {discountType === "percentage" ? "(%)" : "(PKR)"}</Label>
                <Input id="discount_value" name="discount_value" type="number" step="0.01" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
              </div>
            )}
          </div>

          <div className="mt-4 rounded-sm bg-ivory-dark/60 p-4 text-sm">
            <p className="mb-1 text-xs uppercase tracking-wide text-charcoal/50">Live Price Preview</p>
            {!pricePreview ? (
              <p className="text-charcoal/50">Enter weight to preview price.</p>
            ) : !pricePreview.visible ? (
              <p className="font-serif text-lg">{pricePreview.label}</p>
            ) : (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-serif text-xl">{formatPKR(pricePreview.finalPrice)}</span>
                {pricePreview.discountAmount > 0 && <span className="text-charcoal/40 line-through">{formatPKR(pricePreview.basePrice)}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-sm border border-charcoal/10 bg-white p-5">
          <h2 className="mb-4 font-serif text-lg">SEO</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="seo_title">SEO Title</Label>
              <Input id="seo_title" name="seo_title" maxLength={70} defaultValue={initial?.seo_title ?? ""} />
            </div>
            <div>
              <Label htmlFor="seo_description">SEO Description</Label>
              <Textarea id="seo_description" name="seo_description" maxLength={160} defaultValue={initial?.seo_description ?? ""} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-sm border border-charcoal/10 bg-white p-5">
          <h2 className="mb-4 font-serif text-lg">Status</h2>
          <div className="space-y-2.5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={initial?.is_active ?? true} /> Active (visible on site)</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_draft" defaultChecked={initial?.is_draft ?? false} /> Save as Draft</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={initial?.is_featured ?? false} /> Featured</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_new_arrival" defaultChecked={initial?.is_new_arrival ?? false} /> New Arrival</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_bridal" defaultChecked={initial?.is_bridal ?? false} /> Bridal Collection</label>
          </div>
        </div>

        <div className="rounded-sm border border-charcoal/10 bg-white p-5">
          <h2 className="mb-4 font-serif text-lg">{initial ? "Add More Images" : "Product Images"}</h2>
          <input type="file" name="images" multiple accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-charcoal/70 file:mr-3 file:rounded-sm file:border-0 file:bg-charcoal file:px-4 file:py-2 file:text-xs file:font-medium file:text-ivory" />
          <p className="mt-2 text-xs text-charcoal/50">JPEG, PNG or WebP. Max 5MB each. First image becomes the cover if none exists yet.</p>
        </div>

        <Button type="submit" variant="gold" size="lg" className="w-full" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
