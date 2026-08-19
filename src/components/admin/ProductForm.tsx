"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/admin/Card";
import { ProductImagesPanel } from "@/components/admin/ProductImagesPanel";
import { formatPkr, purityLabel } from "@/lib/format";

interface Category {
  id: string;
  name: string;
}

export interface ProductFormValues {
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  purity: "K24" | "K21" | "K18";
  grossWeight: string;
  netGoldWeight: string;
  stoneWeight: string;
  makingCharges: string;
  stoneCharges: string;
  otherCharges: string;
  discount: string;
  taxPercent: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  stockStatus: "IN_STOCK" | "OUT_OF_STOCK" | "MADE_TO_ORDER";
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestseller: boolean;
}

const EMPTY: ProductFormValues = {
  name: "",
  sku: "",
  categoryId: "",
  description: "",
  purity: "K21",
  grossWeight: "",
  netGoldWeight: "",
  stoneWeight: "0",
  makingCharges: "0",
  stoneCharges: "0",
  otherCharges: "0",
  discount: "0",
  taxPercent: "0",
  status: "DRAFT",
  stockStatus: "IN_STOCK",
  isFeatured: false,
  isNewArrival: false,
  isBestseller: false,
};

export function ProductForm({
  productId,
  initial,
}: {
  productId?: string;
  initial?: Partial<ProductFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>({ ...EMPTY, ...initial });
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ available: boolean; breakdown?: Record<string, number>; reason?: string } | null>(null);
  const [pricingUsesExtras, setPricingUsesExtras] = useState(false);

  useEffect(() => {
    fetch("/api/admin/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? []));
  }, []);

  const updatePreview = useCallback(async () => {
    if (!values.grossWeight) return;
    const res = await fetch("/api/admin/products/price-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purity: values.purity,
        grossWeight: values.grossWeight,
        makingCharges: values.makingCharges,
        stoneCharges: values.stoneCharges,
        otherCharges: values.otherCharges,
        discount: values.discount,
        taxPercent: values.taxPercent,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setPreview(data.price);
      setPricingUsesExtras(data.pricingUsesExtras);
    }
  }, [values.purity, values.grossWeight, values.makingCharges, values.stoneCharges, values.otherCharges, values.discount, values.taxPercent]);

  useEffect(() => {
    const t = setTimeout(updatePreview, 350);
    return () => clearTimeout(t);
  }, [updatePreview]);

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fieldErrors ?? { form: data.error ?? "Save failed." });
        return;
      }
      if (!productId) {
        router.push(`/admin/products/${data.product.id}`);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Card title="Basic Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Product Name" required value={values.name} onChange={(e) => update("name", e.target.value)} error={errors.name} className="sm:col-span-2" />
            <Input label="SKU" placeholder="Auto-generated if left blank" value={values.sku} onChange={(e) => update("sku", e.target.value)} error={errors.sku} />
            <Select label="Category" required value={values.categoryId} onChange={(e) => update("categoryId", e.target.value)} error={errors.categoryId}>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Textarea label="Description" rows={4} value={values.description} onChange={(e) => update("description", e.target.value)} className="sm:col-span-2" />
          </div>
        </Card>

        <Card title="Gold Details">
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Purity" required value={values.purity} onChange={(e) => update("purity", e.target.value as ProductFormValues["purity"])}>
              <option value="K24">24K</option>
              <option value="K21">21K</option>
              <option value="K18">18K</option>
            </Select>
            <Input label="Gross Weight (g)" type="number" step="0.001" required value={values.grossWeight} onChange={(e) => update("grossWeight", e.target.value)} error={errors.grossWeight} />
            <Input label="Net Gold Weight (g)" type="number" step="0.001" required value={values.netGoldWeight} onChange={(e) => update("netGoldWeight", e.target.value)} error={errors.netGoldWeight} />
            <Input label="Stone Weight (g)" type="number" step="0.001" value={values.stoneWeight} onChange={(e) => update("stoneWeight", e.target.value)} />
          </div>
        </Card>

        <Card title="Optional Pricing Charges" action={<span className="text-xs text-brown-light">Enabled in Settings → Gold</span>}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Making Charges (PKR)" type="number" step="0.01" value={values.makingCharges} onChange={(e) => update("makingCharges", e.target.value)} />
            <Input label="Stone Charges (PKR)" type="number" step="0.01" value={values.stoneCharges} onChange={(e) => update("stoneCharges", e.target.value)} />
            <Input label="Other Charges (PKR)" type="number" step="0.01" value={values.otherCharges} onChange={(e) => update("otherCharges", e.target.value)} />
            <Input label="Discount (PKR)" type="number" step="0.01" value={values.discount} onChange={(e) => update("discount", e.target.value)} />
            <Input label="Tax (%)" type="number" step="0.01" value={values.taxPercent} onChange={(e) => update("taxPercent", e.target.value)} />
          </div>
        </Card>

        <Card title="Flags &amp; Status">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Status" value={values.status} onChange={(e) => update("status", e.target.value as ProductFormValues["status"])}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
            <Select label="Stock Status" value={values.stockStatus} onChange={(e) => update("stockStatus", e.target.value as ProductFormValues["stockStatus"])}>
              <option value="IN_STOCK">In Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="MADE_TO_ORDER">Made to Order</option>
            </Select>
          </div>
          <div className="mt-4 flex flex-wrap gap-6 text-sm">
            {(["isFeatured", "isNewArrival", "isBestseller"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input type="checkbox" checked={values[key]} onChange={(e) => update(key, e.target.checked)} className="h-4 w-4 accent-maroon" />
                {key === "isFeatured" ? "Featured Product" : key === "isNewArrival" ? "New Arrival" : "Bestseller"}
              </label>
            ))}
          </div>
        </Card>

        {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
        <Button type="submit" loading={saving} className="self-start">
          {productId ? "Save Changes" : "Create Product"}
        </Button>
      </div>

      <div>
        <Card title="Price Preview" className="sticky top-20">
          <p className="text-xs text-brown-light">
            Calculated automatically by the server from today&apos;s {purityLabel(values.purity)} gold rate.
            Never edited manually.
          </p>
          {preview?.available && preview.breakdown ? (
            <dl className="mt-4 space-y-1.5 text-sm">
              <Row label="Gross Weight" value={`${Number(values.grossWeight || 0).toFixed(3)} g`} />
              <Row label="Gold Value" value={formatPkr(preview.breakdown.goldValue)} />
              {pricingUsesExtras && (
                <>
                  {preview.breakdown.makingCharges > 0 && <Row label="Making Charges" value={formatPkr(preview.breakdown.makingCharges)} />}
                  {preview.breakdown.stoneCharges > 0 && <Row label="Stone Charges" value={formatPkr(preview.breakdown.stoneCharges)} />}
                  {preview.breakdown.otherCharges > 0 && <Row label="Other Charges" value={formatPkr(preview.breakdown.otherCharges)} />}
                  {preview.breakdown.discount > 0 && <Row label="Discount" value={`- ${formatPkr(preview.breakdown.discount)}`} />}
                  {preview.breakdown.taxAmount > 0 && <Row label="Tax" value={formatPkr(preview.breakdown.taxAmount)} />}
                </>
              )}
              <div className="gold-divider my-2" />
              <Row label="Final Price" value={formatPkr(preview.breakdown.finalPrice)} bold />
            </dl>
          ) : (
            <p className="mt-4 text-sm italic text-brown-light">{preview?.reason ?? "Enter gross weight to see a live price preview."}</p>
          )}
        </Card>

        {productId && (
          <div className="mt-6">
            <ProductImagesPanel productId={productId} />
          </div>
        )}
      </div>
    </form>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-maroon" : "text-brown-light"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
