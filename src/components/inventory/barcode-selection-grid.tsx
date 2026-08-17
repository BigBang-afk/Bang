"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { PURITY_LABELS, type GoldPurity } from "@/types/gold";

export type BarcodeSelectionRow = {
  id: string;
  barcodeCode: string | null;
  productName: string;
  productImageUrl: string | null;
  purity: GoldPurity;
  sellingPrice: string;
};

export function BarcodeSelectionGrid({ rows }: { rows: BarcodeSelectionRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const printHref = `/inventory/barcodes/print?ids=${Array.from(selected).join(",")}`;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((row) => {
          const isChecked = selected.has(row.id);
          const code = row.barcodeCode ?? "—";
          return (
            <Card key={row.id} className={isChecked ? "border-gold" : undefined}>
              <CardContent className="flex items-center gap-3 py-3">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(row.id)}
                  className="size-4 shrink-0 rounded border-border-strong"
                  aria-label={`Select ${row.productName}`}
                />
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-elevated">
                  {row.productImageUrl ? (
                    <Image src={row.productImageUrl} alt={row.productName} width={40} height={40} className="size-10 object-cover" />
                  ) : (
                    <ImageOff className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{row.productName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{code}</p>
                  <p className="text-xs text-muted-foreground">
                    {PURITY_LABELS[row.purity]} · {formatCurrency(row.sellingPrice)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {rows.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">No stock items found.</p>
      )}

      <div className="sticky bottom-0 flex items-center justify-between border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <p className="text-sm text-muted-foreground">{selected.size} selected</p>
        <Button asChild disabled={selected.size === 0}>
          <Link href={printHref} aria-disabled={selected.size === 0}>
            <Printer className="size-4" />
            Print Selected ({selected.size})
          </Link>
        </Button>
      </div>
    </div>
  );
}
