"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductImageField } from "@/components/inventory/product-image-field";
import { formatCurrency, formatWeight } from "@/lib/format";
import { GOLD_PURITIES, PURITY_LABELS, type GoldPurity, type WastageType, type SimpleGoldRate } from "@/types/gold";
import {
  createInventoryItemAction,
  updateInventoryItemAction,
  type InventoryItemFormState,
} from "@/lib/actions/inventory.actions";
import {
  previewInventoryPricingAction,
  type InventoryPricingPreviewState,
} from "@/lib/actions/inventory-pricing.actions";
import type { ProductCategoryRow } from "@/services/product-category.service";
import type { EditableStockItem } from "@/types/inventory";

type StockFormProps = {
  mode: "create" | "edit";
  categories: ProductCategoryRow[];
  todaysRates: SimpleGoldRate[];
  initialItem?: EditableStockItem;
};

export function StockForm({ mode, categories, todaysRates, initialItem }: StockFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createInventoryItemAction : updateInventoryItemAction;
  const [state, formAction, pending] = useActionState<InventoryItemFormState, FormData>(
    action,
    undefined,
  );

  const rateByPurity = useMemo(
    () => new Map(todaysRates.map((rate) => [rate.purity, rate.ratePerGram])),
    [todaysRates],
  );

  const [purity, setPurity] = useState<GoldPurity>(initialItem?.purity ?? "K22");
  const [goldRate, setGoldRate] = useState(
    initialItem?.goldRatePerGram.toString() ?? rateByPurity.get(purity) ?? "",
  );
  const [netWeight, setNetWeight] = useState(initialItem?.netWeight.toString() ?? "");
  const [wastageType, setWastageType] = useState<WastageType>(
    (initialItem?.wastageType as WastageType) ?? "PERCENTAGE",
  );
  const [wastagePercent, setWastagePercent] = useState(
    initialItem?.wastagePercent?.toString() ?? "5",
  );
  const [wastageGrams, setWastageGrams] = useState(
    initialItem?.wastageType === "FIXED_GRAMS" ? initialItem.wastageWeight.toString() : "0",
  );
  const [makingCharge, setMakingCharge] = useState(initialItem?.makingCharge.toString() ?? "0");
  const [stoneCharge, setStoneCharge] = useState(initialItem?.stoneCharge.toString() ?? "0");
  const [diamondCharge, setDiamondCharge] = useState(initialItem?.diamondCharge.toString() ?? "0");
  const [otherCharge, setOtherCharge] = useState(initialItem?.otherCharge.toString() ?? "0");
  const [sellingPrice, setSellingPrice] = useState(initialItem?.sellingPrice.toString() ?? "");
  const [confirmLowerPrice, setConfirmLowerPrice] = useState(false);

  const [preview, setPreview] = useState<InventoryPricingPreviewState>();
  const [previewPending, startPreviewTransition] = useTransition();

  function handlePurityChange(value: GoldPurity) {
    setPurity(value);
    const rate = rateByPurity.get(value);
    if (rate) setGoldRate(rate);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      startPreviewTransition(async () => {
        const result = await previewInventoryPricingAction({
          netWeight,
          goldRate,
          wastageType,
          wastagePercent: wastageType === "PERCENTAGE" ? wastagePercent : undefined,
          wastageGrams: wastageType === "FIXED_GRAMS" ? wastageGrams : undefined,
          makingCharge,
          stoneCharge,
          diamondCharge,
          otherCharge,
          sellingPrice,
        });
        setPreview(result);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [netWeight, goldRate, wastageType, wastagePercent, wastageGrams, makingCharge, stoneCharge, diamondCharge, otherCharge, sellingPrice]);

  useEffect(() => {
    if (state?.success && state.itemId) {
      toast.success(mode === "create" ? "Stock added." : "Stock updated.");
      router.push(`/inventory/${state.itemId}`);
    }
  }, [state, mode, router]);

  const result = preview?.result;
  const isBelowCost =
    result && Number(result.sellingPrice) < Number(result.totalCost) && Number(result.sellingPrice) > 0;

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initialItem && <input type="hidden" name="id" value={initialItem.id} />}

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              name="productName"
              required
              defaultValue={initialItem?.product.name}
              aria-invalid={!!state?.fieldErrors?.productName}
            />
            <FieldError message={state?.fieldErrors?.productName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="categoryId">Category</Label>
            <Select name="categoryId" defaultValue={initialItem?.product.categoryId} required>
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={state?.fieldErrors?.categoryId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subcategory">
              Subcategory <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="subcategory" name="subcategory" defaultValue={initialItem?.product.subcategory ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="designNumber">
              Design Number <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="designNumber" name="designNumber" defaultValue={initialItem?.product.designNumber ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supplier">
              Supplier <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="supplier" name="supplier" defaultValue={initialItem?.product.supplier ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="karigar">
              Karigar <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="karigar" name="karigar" defaultValue={initialItem?.product.karigar ?? ""} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">
              Notes <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={initialItem?.product.notes ?? ""}
              className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            />
          </div>

          <div className="sm:col-span-2">
            <ProductImageField initialImageUrl={initialItem?.product.imageUrl} error={state?.fieldErrors?.image} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gold Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Purity</Label>
              <Select name="purity" value={purity} onValueChange={(value) => handlePurityChange(value as GoldPurity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOLD_PURITIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {PURITY_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goldRate">Gold Rate (per gram)</Label>
              <Input
                id="goldRate"
                name="goldRate"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={goldRate}
                onChange={(event) => setGoldRate(event.target.value)}
                aria-invalid={!!state?.fieldErrors?.goldRate}
              />
              <FieldError message={state?.fieldErrors?.goldRate} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="netWeight">Net Weight (grams)</Label>
              <Input
                id="netWeight"
                name="netWeight"
                type="number"
                inputMode="decimal"
                step="0.001"
                value={netWeight}
                onChange={(event) => setNetWeight(event.target.value)}
                aria-invalid={!!state?.fieldErrors?.netWeight}
              />
              <FieldError message={state?.fieldErrors?.netWeight} />
            </div>

            <div className="space-y-1.5">
              <Label>Wastage Type</Label>
              <input type="hidden" name="wastageType" value={wastageType} />
              <Tabs value={wastageType} onValueChange={(value) => setWastageType(value as WastageType)}>
                <TabsList className="w-full">
                  <TabsTrigger value="PERCENTAGE" className="flex-1">
                    Percentage
                  </TabsTrigger>
                  <TabsTrigger value="FIXED_GRAMS" className="flex-1">
                    Fixed Grams
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {wastageType === "PERCENTAGE" ? (
              <div className="space-y-1.5">
                <Label htmlFor="wastagePercent">Wastage %</Label>
                <Input
                  id="wastagePercent"
                  name="wastagePercent"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={wastagePercent}
                  onChange={(event) => setWastagePercent(event.target.value)}
                  aria-invalid={!!state?.fieldErrors?.wastagePercent}
                />
                <FieldError message={state?.fieldErrors?.wastagePercent} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="wastageGrams">Wastage (grams)</Label>
                <Input
                  id="wastageGrams"
                  name="wastageGrams"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  value={wastageGrams}
                  onChange={(event) => setWastageGrams(event.target.value)}
                  aria-invalid={!!state?.fieldErrors?.wastageGrams}
                />
                <FieldError message={state?.fieldErrors?.wastageGrams} />
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-surface-elevated p-5">
            {preview?.error ? (
              <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                {preview.error}
              </p>
            ) : result ? (
              <div className="space-y-3">
                <PreviewRow label="Net Weight" value={formatWeight(result.netWeight)} />
                <PreviewRow
                  label="Wastage"
                  value={
                    result.wastagePercent
                      ? `${result.wastagePercent}%  ·  ${formatWeight(result.wastageWeight)}`
                      : formatWeight(result.wastageWeight)
                  }
                />
                <Separator />
                <PreviewRow label="Gross Weight" value={formatWeight(result.grossWeight)} emphasize />
                <PreviewRow label="Gold Value" value={formatCurrency(result.goldValue)} emphasize gold />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Calculating...</p>
            )}
            <p className="mt-4 text-[11px] text-muted-foreground">
              {previewPending ? "Recalculating on server..." : "Verified by the server calculation engine."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ChargeField
              label="Making Charges"
              name="makingCharge"
              value={makingCharge}
              onChange={setMakingCharge}
              error={state?.fieldErrors?.makingCharge}
            />
            <ChargeField
              label="Stone Charges"
              name="stoneCharge"
              value={stoneCharge}
              onChange={setStoneCharge}
              error={state?.fieldErrors?.stoneCharge}
            />
            <ChargeField
              label="Diamond Charges"
              name="diamondCharge"
              value={diamondCharge}
              onChange={setDiamondCharge}
              error={state?.fieldErrors?.diamondCharge}
            />
            <ChargeField
              label="Other Charges"
              name="otherCharge"
              value={otherCharge}
              onChange={setOtherCharge}
              error={state?.fieldErrors?.otherCharge}
            />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input
                id="sellingPrice"
                name="sellingPrice"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={sellingPrice}
                onChange={(event) => setSellingPrice(event.target.value)}
                aria-invalid={!!state?.fieldErrors?.sellingPrice}
              />
              <FieldError message={state?.fieldErrors?.sellingPrice} />
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface-elevated p-5">
            {result && (
              <div className="space-y-3">
                <PreviewRow label="Gold Value" value={formatCurrency(result.goldValue)} />
                <PreviewRow label="+ Making Charges" value={formatCurrency(result.makingCharge)} />
                <PreviewRow label="+ Stone Charges" value={formatCurrency(result.stoneCharge)} />
                <PreviewRow label="+ Diamond Charges" value={formatCurrency(result.diamondCharge)} />
                <PreviewRow label="+ Other Charges" value={formatCurrency(result.otherCharge)} />
                <Separator />
                <PreviewRow label="Total Cost" value={formatCurrency(result.totalCost)} emphasize />
                <PreviewRow label="Selling Price" value={formatCurrency(result.sellingPrice)} emphasize gold />
                <Separator />
                <PreviewRow
                  label="Expected Profit"
                  value={formatCurrency(result.expectedProfit)}
                  emphasize
                  danger={Number(result.expectedProfit) < 0}
                />
                <PreviewRow label="Profit Margin" value={`${result.profitMarginPercent}%`} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isBelowCost && (
        <Card className="border-warning/40">
          <CardContent className="flex items-start gap-3 py-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-warning">
                Selling price is below total cost — this item will be recorded at a loss.
              </p>
              <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  name="confirmLowerPrice"
                  checked={confirmLowerPrice}
                  onChange={(event) => setConfirmLowerPrice(event.target.checked)}
                  className="size-4 rounded border-border-strong"
                />
                I understand and want to save this price anyway.
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle>Barcode</CardTitle>
            <CardDescription>
              A unique ZJ barcode is generated automatically when you save this stock item.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-lg text-gold">ZJ-XXXXXX</p>
            <p className="text-xs text-muted-foreground">Assigned on save — never reused.</p>
          </CardContent>
        </Card>
      )}

      {state?.error && (
        <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Saving..." : mode === "create" ? "Save Stock" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-danger">{message}</p>;
}

function ChargeField({
  label,
  name,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        inputMode="decimal"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={!!error}
      />
      <FieldError message={error} />
    </div>
  );
}

function PreviewRow({
  label,
  value,
  emphasize,
  gold,
  danger,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  gold?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className={
          gold
            ? "text-lg font-semibold text-gold"
            : danger
              ? "text-base font-semibold text-danger"
              : emphasize
                ? "text-base font-semibold text-foreground"
                : "text-sm text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
