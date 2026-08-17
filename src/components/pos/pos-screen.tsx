"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScanBarcode, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatWeight } from "@/lib/format";
import { PURITY_LABELS, type GoldPurity } from "@/types/gold";
import {
  lookupBarcodeForSaleAction,
  searchProductsForSaleAction,
  previewCartAction,
  previewPaymentBalanceAction,
  completeSaleAction,
} from "@/lib/actions/sales.actions";
import { CartPanel, type CartLine } from "@/components/pos/cart-panel";
import { PaymentPanel, type PaymentLine } from "@/components/pos/payment-panel";
import { CustomerPicker } from "@/components/pos/customer-picker";
import type { CartPreview, PaymentBalancePreview } from "@/services/sale-preview.service";
import type { CustomerSearchResult } from "@/services/customer.service";
import type { CompletedSale, PosCatalogItem } from "@/types/sales";

function newPaymentLine(): PaymentLine {
  return { key: crypto.randomUUID(), method: "CASH", amount: "", reference: "" };
}

export function PosScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [preview, setPreview] = useState<CartPreview | null>(null);
  const [previewPending, startPreviewTransition] = useTransition();

  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<PosCatalogItem[]>([]);
  const [searchPending, startSearchTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [customer, setCustomer] = useState<CustomerSearchResult | null>(null);
  const [payments, setPayments] = useState<PaymentLine[]>([newPaymentLine()]);
  const [paymentPreview, setPaymentPreview] = useState<PaymentBalancePreview | null>(null);

  const [submitting, startSubmitTransition] = useTransition();
  const submittingRef = useRef(false);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

  // Live pricing preview — recalculated server-side on every cart change.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (cart.length === 0) {
        setPreview(null);
        return;
      }
      startPreviewTransition(async () => {
        const result = await previewCartAction(
          cart.map((line) => ({
            inventoryItemId: line.item.inventoryItemId,
            discountType: line.discountType,
            discountValue: line.discountValue,
          })),
        );
        if (result.ok) setPreview(result.data);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [cart]);

  // Live payment balance preview.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (!preview || cart.length === 0) {
        setPaymentPreview(null);
        return;
      }
      startPreviewTransition(async () => {
        const result = await previewPaymentBalanceAction(
          payments
            .filter((p) => p.amount.trim() !== "" && Number(p.amount) > 0)
            .map((p) => ({ method: p.method, amount: Number(p.amount), reference: p.reference || undefined })),
          preview.grandTotal,
        );
        if (result.ok) setPaymentPreview(result.data);
      });
    }, 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, preview?.grandTotal, cart.length]);

  // Product search-as-you-type.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (!searchValue.trim()) {
        setSearchResults([]);
        return;
      }
      startSearchTransition(async () => {
        const result = await searchProductsForSaleAction(searchValue);
        if (result.ok) setSearchResults(result.data);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [searchValue]);

  const addToCart = useCallback((item: PosCatalogItem) => {
    if (item.status !== "IN_STOCK") {
      toast.error(`${item.productName} is not available for sale (status: ${item.status}).`);
      return;
    }
    setCart((prev) => {
      if (prev.some((l) => l.item.inventoryItemId === item.inventoryItemId)) {
        toast.error(`${item.productName} is already in the cart.`);
        return prev;
      }
      toast.success(`Added ${item.productName}.`);
      return [...prev, { item, discountType: null, discountValue: null }];
    });
    setSearchValue("");
    setSearchResults([]);
  }, []);

  async function handleScanOrSearchSubmit() {
    const code = searchValue.trim();
    if (!code) return;

    const result = await lookupBarcodeForSaleAction(code);
    if (result.ok && result.data) {
      addToCart(result.data);
      return;
    }
    if (searchResults.length > 0) {
      addToCart(searchResults[0]);
      return;
    }
    toast.error(`No matching item found for "${code}".`);
  }

  function handleDiscountChange(
    inventoryItemId: string,
    type: CartLine["discountType"],
    value: number | null,
  ) {
    setCart((prev) =>
      prev.map((l) => (l.item.inventoryItemId === inventoryItemId ? { ...l, discountType: type, discountValue: value } : l)),
    );
  }

  function handleRemoveFromCart(inventoryItemId: string) {
    setCart((prev) => prev.filter((l) => l.item.inventoryItemId !== inventoryItemId));
  }

  function handleAddPayment() {
    setPayments((prev) => [...prev, newPaymentLine()]);
  }
  function handlePaymentChange(key: string, patch: Partial<PaymentLine>) {
    setPayments((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }
  function handleRemovePayment(key: string) {
    setPayments((prev) => (prev.length > 1 ? prev.filter((p) => p.key !== key) : prev));
  }

  const canComplete =
    cart.length > 0 &&
    preview !== null &&
    preview.allItemsValid &&
    paymentPreview !== null &&
    paymentPreview.isBalanced &&
    !submitting;

  function handleCompleteSale() {
    if (submittingRef.current || !canComplete || !preview) return;
    submittingRef.current = true;

    startSubmitTransition(async () => {
      try {
        const result = await completeSaleAction({
          items: cart.map((line) => ({
            inventoryItemId: line.item.inventoryItemId,
            discountType: line.discountType,
            discountValue: line.discountValue,
          })),
          customerId: customer?.id ?? null,
          payments: payments
            .filter((p) => Number(p.amount) > 0)
            .map((p) => ({ method: p.method, amount: Number(p.amount), reference: p.reference || undefined })),
          clientRequestId: crypto.randomUUID(),
        });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        setCompletedSale(result.data);
        setCart([]);
        setCustomer(null);
        setPayments([newPaymentLine()]);
        setPreview(null);
        setPaymentPreview(null);
      } finally {
        submittingRef.current = false;
      }
    });
  }

  // Keyboard shortcuts — see POS.md "Keyboard shortcuts".
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F2" || (e.ctrlKey && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleCompleteSale();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchValue("");
        setSearchResults([]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canComplete, preview, cart, payments, customer]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                autoFocus
                placeholder="Scan barcode or search by product name / design number... (F2)"
                className="pl-9"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScanOrSearchSubmit();
                  }
                }}
              />
            </div>

            {searchValue.trim() && (
              <div className="mt-3 max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
                {searchPending && <p className="p-3 text-xs text-muted-foreground">Searching...</p>}
                {!searchPending && searchResults.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground">No in-stock items match.</p>
                )}
                {searchResults.map((item) => (
                  <button
                    key={item.inventoryItemId}
                    type="button"
                    onClick={() => addToCart(item)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-surface-hover"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.barcodeCode ?? "No barcode"} · {PURITY_LABELS[item.purity as GoldPurity]} ·{" "}
                        {formatWeight(item.grossWeight)}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium text-foreground">
                      {formatCurrency(item.sellingPrice)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <CartPanel
          lines={cart}
          preview={preview}
          onDiscountChange={handleDiscountChange}
          onRemove={handleRemoveFromCart}
        />
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-96">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerPicker value={customer} onChange={setCustomer} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{formatCurrency(preview?.subtotal ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-foreground">-{formatCurrency(preview?.discount ?? 0)}</span>
            </div>
            {preview?.taxEnabled && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({preview.taxPercent}%)</span>
                <span className="text-foreground">{formatCurrency(preview.tax)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span className="text-foreground">Grand Total</span>
              <span className="text-gold">{formatCurrency(preview?.grandTotal ?? 0)}</span>
            </div>
            {previewPending && <p className="text-xs text-muted-foreground">Recalculating...</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentPanel
              lines={payments}
              balancePreview={paymentPreview}
              hasCustomer={customer !== null}
              onAdd={handleAddPayment}
              onChange={handlePaymentChange}
              onRemove={handleRemovePayment}
            />
          </CardContent>
        </Card>

        <Button
          size="lg"
          disabled={!canComplete}
          onClick={handleCompleteSale}
          className="h-14 text-base"
        >
          {submitting ? "Completing sale..." : "Complete Sale (Ctrl+Enter)"}
        </Button>
      </div>

      <SaleSuccessDialog sale={completedSale} onClose={() => setCompletedSale(null)} router={router} />
    </div>
  );
}

function SaleSuccessDialog({
  sale,
  onClose,
  router,
}: {
  sale: CompletedSale | null;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <Dialog open={sale !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="size-5 text-gold" />
            Sale completed
          </DialogTitle>
          <DialogDescription>
            Invoice <span className="font-medium text-foreground">{sale?.invoiceNumber}</span> for{" "}
            {sale && formatCurrency(sale.grandTotal)} has been recorded.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            New sale
          </Button>
          <Button
            onClick={() => {
              if (sale) router.push(`/pos/sales/${sale.id}`);
            }}
          >
            View invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
