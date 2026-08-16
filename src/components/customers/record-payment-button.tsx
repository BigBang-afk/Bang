"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { CUSTOMER_PAYMENT_METHODS, type CustomerPaymentMethodValue } from "@/types/customers";
import { PAYMENT_METHOD_LABELS } from "@/types/sales";
import { recordCustomerPaymentAction } from "@/lib/actions/customers.actions";

export function RecordPaymentButton({
  customerId,
  outstandingBalance,
}: {
  customerId: string;
  outstandingBalance: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<CustomerPaymentMethodValue>("CASH");
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await recordCustomerPaymentAction({
        customerId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Payment recorded. New balance: ${formatCurrency(result.data.balanceAfter)}.`);
      setOpen(false);
      setAmount("");
      setReference("");
      router.refresh();
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Wallet className="size-4" />
        Receive Payment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive customer payment</DialogTitle>
            <DialogDescription>
              Current outstanding balance: {formatCurrency(outstandingBalance)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as CustomerPaymentMethodValue)}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="payment-reference">Reference (optional)</Label>
              <Input id="payment-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={pending || !amount || Number(amount) <= 0}>
              {pending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
