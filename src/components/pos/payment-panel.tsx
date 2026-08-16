"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethodValue } from "@/types/sales";
import type { PaymentBalancePreview } from "@/services/sale-preview.service";

export type PaymentLine = {
  key: string;
  method: PaymentMethodValue;
  amount: string;
  reference: string;
};

export function PaymentPanel({
  lines,
  balancePreview,
  hasCustomer,
  onAdd,
  onChange,
  onRemove,
}: {
  lines: PaymentLine[];
  balancePreview: PaymentBalancePreview | null;
  hasCustomer: boolean;
  onAdd: () => void;
  onChange: (key: string, patch: Partial<PaymentLine>) => void;
  onRemove: (key: string) => void;
}) {
  const usesCredit = lines.some((l) => l.method === "CREDIT" && Number(l.amount) > 0);

  return (
    <div className="flex flex-col gap-3">
      {lines.map((line) => (
        <div key={line.key} className="flex items-center gap-2">
          <Select
            value={line.method}
            onValueChange={(v) => onChange(line.key, { method: v as PaymentMethodValue })}
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
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
            value={line.amount}
            onChange={(e) => onChange(line.key, { amount: e.target.value })}
          />
          <Input
            placeholder="Reference (optional)"
            className="h-9 flex-1"
            value={line.reference}
            onChange={(e) => onChange(line.key, { reference: e.target.value })}
          />
          <button
            type="button"
            onClick={() => onRemove(line.key)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
            title="Remove payment line"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={onAdd} className="self-start">
        <Plus className="size-4" />
        Add payment method
      </Button>

      {usesCredit && !hasCustomer && (
        <p className="text-xs text-danger">
          A customer must be selected to extend credit — walk-in sales must be paid in full.
        </p>
      )}

      {balancePreview && (
        <div className="rounded-md border border-border bg-surface-elevated p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid</span>
            <span className="font-medium text-foreground">{formatCurrency(balancePreview.paidAmount)}</span>
          </div>
          {Number(balancePreview.balanceAmount) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">On credit</span>
              <span className="font-medium text-warning">{formatCurrency(balancePreview.balanceAmount)}</span>
            </div>
          )}
          {balancePreview.error && <p className="mt-1 text-xs text-danger">{balancePreview.error}</p>}
        </div>
      )}
    </div>
  );
}
