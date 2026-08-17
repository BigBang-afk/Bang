"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Decimal from "decimal.js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency, formatWeight } from "@/lib/format";
import { GOLD_PURITIES, PURITY_LABELS, WASTAGE_TYPES } from "@/types/gold";
import { PURCHASE_PAYMENT_METHODS } from "@/types/purchases";
import { calculateGoldValue, GoldCalculationError } from "@/services/gold-calculation.service";
import { SupplierPicker } from "@/components/purchases/supplier-picker";
import { createPurchaseAction } from "@/lib/actions/purchases.actions";
import type { SupplierRow } from "@/services/supplier.service";

type ItemRow = {
  key: string;
  productName: string;
  categoryId: string;
  purity: (typeof GOLD_PURITIES)[number];
  netWeight: string;
  goldRate: string;
  wastageType: (typeof WASTAGE_TYPES)[number];
  wastagePercent: string;
  wastageGrams: string;
  makingCharge: string;
  stoneCharge: string;
  diamondCharge: string;
  otherCharge: string;
  addToInventory: boolean;
  sellingPrice: string;
};

type PaymentRow = { key: string; amount: string; method: (typeof PURCHASE_PAYMENT_METHODS)[number]; reference: string };

function emptyItem(key: string = crypto.randomUUID()): ItemRow {
  return {
    key,
    productName: "",
    categoryId: "",
    purity: "K21",
    netWeight: "",
    goldRate: "",
    wastageType: "PERCENTAGE",
    wastagePercent: "5",
    wastageGrams: "",
    makingCharge: "0",
    stoneCharge: "0",
    diamondCharge: "0",
    otherCharge: "0",
    addToInventory: false,
    sellingPrice: "",
  };
}

function computeItemTotal(item: ItemRow): { grossWeight: Decimal; goldValue: Decimal; totalCost: Decimal } | null {
  if (!item.netWeight || !item.goldRate) return null;
  try {
    const calc = calculateGoldValue({
      netWeight: item.netWeight,
      goldRate: item.goldRate,
      wastage:
        item.wastageType === "PERCENTAGE"
          ? { type: "PERCENTAGE", wastagePercent: item.wastagePercent || 0 }
          : { type: "FIXED_GRAMS", wastageGrams: item.wastageGrams || 0 },
    });
    const charges = new Decimal(item.makingCharge || 0)
      .add(item.stoneCharge || 0)
      .add(item.diamondCharge || 0)
      .add(item.otherCharge || 0);
    return { grossWeight: calc.grossWeight, goldValue: calc.goldValue, totalCost: calc.goldValue.add(charges) };
  } catch (error) {
    if (error instanceof GoldCalculationError) return null;
    throw error;
  }
}

export function NewPurchaseForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  // Fixed initial keys — crypto.randomUUID() must never run during the
  // initial render, since it would produce a different value during SSR
  // than during client hydration and break React's hydration check. Rows
  // added later via addItem()/addPayment() only ever run client-side (an
  // event handler), so randomUUID() there is safe.
  const [items, setItems] = useState<ItemRow[]>([emptyItem("item-initial")]);
  const [payments, setPayments] = useState<PaymentRow[]>([
    { key: "payment-initial", amount: "", method: "CASH", reference: "" },
  ]);
  const [pending, startTransition] = useTransition();

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));
  }

  function updatePayment(key: string, patch: Partial<PaymentRow>) {
    setPayments((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }
  function addPayment() {
    setPayments((prev) => [...prev, { key: crypto.randomUUID(), amount: "", method: "CASH", reference: "" }]);
  }
  function removePayment(key: string) {
    setPayments((prev) => prev.filter((p) => p.key !== key));
  }

  const itemTotals = useMemo(() => items.map((item) => ({ item, total: computeItemTotal(item) })), [items]);
  const grandTotal = itemTotals.reduce(
    (sum, { total }) => sum.add(total?.totalCost ?? 0),
    new Decimal(0),
  );
  const paidAmount = payments.reduce((sum, p) => sum.add(p.amount || 0), new Decimal(0));
  const balance = grandTotal.sub(paidAmount);

  function handleSubmit() {
    if (!supplier) {
      toast.error("Select a supplier.");
      return;
    }
    startTransition(async () => {
      const result = await createPurchaseAction({
        supplierId: supplier.id,
        referenceNumber: referenceNumber || undefined,
        items: items.map((item) => ({
          productName: item.productName,
          categoryId: item.categoryId || undefined,
          purity: item.purity,
          netWeight: Number(item.netWeight),
          goldRate: Number(item.goldRate),
          wastageType: item.wastageType,
          wastagePercent: item.wastageType === "PERCENTAGE" ? Number(item.wastagePercent || 0) : undefined,
          wastageGrams: item.wastageType === "FIXED_GRAMS" ? Number(item.wastageGrams || 0) : undefined,
          makingCharge: Number(item.makingCharge || 0),
          stoneCharge: Number(item.stoneCharge || 0),
          diamondCharge: Number(item.diamondCharge || 0),
          otherCharge: Number(item.otherCharge || 0),
          addToInventory: item.addToInventory,
          sellingPrice: item.addToInventory ? Number(item.sellingPrice) : undefined,
        })),
        payments: payments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({ amount: Number(p.amount), method: p.method, reference: p.reference || undefined })),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Purchase ${result.data.purchaseNumber} saved.`);
      router.push(`/purchases/${result.data.purchaseId}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Supplier</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Supplier</Label>
            <SupplierPicker selected={supplier} onSelect={setSupplier} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="reference-number">Reference Number</Label>
            <Input id="reference-number" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="size-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {itemTotals.map(({ item, total }) => (
            <div key={item.key} className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Item</p>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(item.key)} className="text-danger hover:opacity-80">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor={`name-${item.key}`}>Product Name</Label>
                  <Input
                    id={`name-${item.key}`}
                    value={item.productName}
                    onChange={(e) => updateItem(item.key, { productName: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`category-${item.key}`}>Category</Label>
                  <Select value={item.categoryId} onValueChange={(v) => updateItem(item.key, { categoryId: v })}>
                    <SelectTrigger id={`category-${item.key}`}>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`purity-${item.key}`}>Purity</Label>
                  <Select value={item.purity} onValueChange={(v) => updateItem(item.key, { purity: v as ItemRow["purity"] })}>
                    <SelectTrigger id={`purity-${item.key}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOLD_PURITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PURITY_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`weight-${item.key}`}>Net Weight (g)</Label>
                  <Input
                    id={`weight-${item.key}`}
                    type="number"
                    min={0}
                    step="0.001"
                    value={item.netWeight}
                    onChange={(e) => updateItem(item.key, { netWeight: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`rate-${item.key}`}>Gold Rate (per g)</Label>
                  <Input
                    id={`rate-${item.key}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.goldRate}
                    onChange={(e) => updateItem(item.key, { goldRate: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`wastage-type-${item.key}`}>Wastage Type</Label>
                  <Select
                    value={item.wastageType}
                    onValueChange={(v) => updateItem(item.key, { wastageType: v as ItemRow["wastageType"] })}
                  >
                    <SelectTrigger id={`wastage-type-${item.key}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED_GRAMS">Fixed Grams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {item.wastageType === "PERCENTAGE" ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor={`wastage-percent-${item.key}`}>Wastage %</Label>
                    <Input
                      id={`wastage-percent-${item.key}`}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={item.wastagePercent}
                      onChange={(e) => updateItem(item.key, { wastagePercent: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    <Label htmlFor={`wastage-grams-${item.key}`}>Wastage (g)</Label>
                    <Input
                      id={`wastage-grams-${item.key}`}
                      type="number"
                      min={0}
                      step="0.001"
                      value={item.wastageGrams}
                      onChange={(e) => updateItem(item.key, { wastageGrams: e.target.value })}
                    />
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor={`making-${item.key}`}>Making Charge</Label>
                  <Input
                    id={`making-${item.key}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.makingCharge}
                    onChange={(e) => updateItem(item.key, { makingCharge: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`stone-${item.key}`}>Stone Charge</Label>
                  <Input
                    id={`stone-${item.key}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.stoneCharge}
                    onChange={(e) => updateItem(item.key, { stoneCharge: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`diamond-${item.key}`}>Diamond Charge</Label>
                  <Input
                    id={`diamond-${item.key}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.diamondCharge}
                    onChange={(e) => updateItem(item.key, { diamondCharge: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`other-${item.key}`}>Other Charge</Label>
                  <Input
                    id={`other-${item.key}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.otherCharge}
                    onChange={(e) => updateItem(item.key, { otherCharge: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={item.addToInventory}
                    onChange={(e) => updateItem(item.key, { addToInventory: e.target.checked })}
                  />
                  Add to Inventory (mark as sellable stock)
                </label>
                {item.addToInventory && (
                  <div className="grid gap-1.5">
                    <Label htmlFor={`selling-${item.key}`} className="text-xs">
                      Selling Price
                    </Label>
                    <Input
                      id={`selling-${item.key}`}
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-8 w-40"
                      value={item.sellingPrice}
                      onChange={(e) => updateItem(item.key, { sellingPrice: e.target.value })}
                    />
                  </div>
                )}
                {total && (
                  <p className="ml-auto text-sm text-muted-foreground">
                    Gross: <span className="font-mono text-foreground">{formatWeight(total.grossWeight)}</span> · Gold
                    Value: <span className="font-mono text-gold">{formatCurrency(total.goldValue)}</span> · Item Total:{" "}
                    <span className="font-mono text-foreground">{formatCurrency(total.totalCost)}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment</CardTitle>
          <Button variant="outline" size="sm" onClick={addPayment}>
            <Plus className="size-4" />
            Add Payment
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {payments.map((payment) => (
            <div key={payment.key} className="flex items-center gap-2">
              <Select value={payment.method} onValueChange={(v) => updatePayment(payment.key, { method: v as PaymentRow["method"] })}>
                <SelectTrigger className="h-9 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Amount"
                className="h-9 flex-1"
                value={payment.amount}
                onChange={(e) => updatePayment(payment.key, { amount: e.target.value })}
              />
              <Input
                placeholder="Reference (optional)"
                className="h-9 flex-1"
                value={payment.reference}
                onChange={(e) => updatePayment(payment.key, { reference: e.target.value })}
              />
              {payments.length > 1 && (
                <button type="button" onClick={() => removePayment(payment.key)} className="text-danger hover:opacity-80">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground">Grand Total</TableCell>
                <TableCell className="text-right font-medium text-gold">{formatCurrency(grandTotal)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Paid</TableCell>
                <TableCell className="text-right text-success">{formatCurrency(paidAmount)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-foreground">Balance (Payable)</TableCell>
                <TableCell className={`text-right font-medium ${balance.gt(0) ? "text-danger" : "text-foreground"}`}>
                  {formatCurrency(balance.gt(0) ? balance : 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Button size="lg" className="h-12 self-end" disabled={pending || !supplier} onClick={handleSubmit}>
        {pending ? "Saving..." : "Save Purchase"}
      </Button>
    </div>
  );
}
