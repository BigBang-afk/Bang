"use client";

import { Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { formatCurrency, formatWeight } from "@/lib/format";
import { PURITY_LABELS, type GoldPurity } from "@/types/gold";
import type { CartPreview } from "@/services/sale-preview.service";
import type { DiscountTypeValue } from "@/services/sale-pricing.service";
import type { PosCatalogItem } from "@/types/sales";

export type CartLine = {
  item: PosCatalogItem;
  discountType: DiscountTypeValue | null;
  discountValue: number | null;
};

export function CartPanel({
  lines,
  preview,
  onDiscountChange,
  onRemove,
}: {
  lines: CartLine[];
  preview: CartPreview | null;
  onDiscountChange: (inventoryItemId: string, type: DiscountTypeValue | null, value: number | null) => void;
  onRemove: (inventoryItemId: string) => void;
}) {
  const previewById = new Map((preview?.items ?? []).map((p) => [p.inventoryItemId, p]));

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Scan a barcode or search for a product to start this sale.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
      {lines.map((line) => {
        const p = previewById.get(line.item.inventoryItemId);
        return (
          <div
            key={line.item.inventoryItemId}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Delete" || e.key === "Backspace") {
                if ((e.target as HTMLElement).tagName === "INPUT") return;
                onRemove(line.item.inventoryItemId);
              }
            }}
            className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 outline-none focus:ring-2 focus:ring-gold/50 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{line.item.productName}</p>
                {p && !p.available && (
                  <span className="flex items-center gap-1 text-xs text-danger">
                    <AlertTriangle className="size-3.5" />
                    {p.unavailableReason}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {line.item.barcodeCode ?? "No barcode"} · {PURITY_LABELS[line.item.purity as GoldPurity]} ·{" "}
                {formatWeight(line.item.grossWeight)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={line.discountType ?? "NONE"}
                onValueChange={(v) =>
                  onDiscountChange(
                    line.item.inventoryItemId,
                    v === "NONE" ? null : (v as DiscountTypeValue),
                    v === "NONE" ? null : line.discountValue,
                  )
                }
              >
                <SelectTrigger className="h-9 w-28" aria-label="Discount type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No discount</SelectItem>
                  <SelectItem value="PERCENTAGE">% off</SelectItem>
                  <SelectItem value="FIXED">Fixed off</SelectItem>
                </SelectContent>
              </Select>
              {line.discountType && (
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Discount"
                  className="h-9 w-24"
                  value={line.discountValue ?? ""}
                  onChange={(e) =>
                    onDiscountChange(
                      line.item.inventoryItemId,
                      line.discountType,
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              )}
            </div>

            <div className="flex w-32 flex-col items-end text-right">
              {p && Number(p.discountAmount) > 0 && (
                <p className="text-xs text-muted-foreground line-through">
                  {formatCurrency(p.originalSellingPrice)}
                </p>
              )}
              <p
                className={
                  p?.exceedsDiscountLimit ? "text-sm font-semibold text-danger" : "text-sm font-semibold text-foreground"
                }
              >
                {formatCurrency(p?.finalPrice ?? line.item.sellingPrice)}
              </p>
              {p?.exceedsDiscountLimit && (
                <p className="text-[11px] text-danger">Exceeds your discount limit</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onRemove(line.item.inventoryItemId)}
              className="self-start rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger sm:self-center"
              title="Remove from cart"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
