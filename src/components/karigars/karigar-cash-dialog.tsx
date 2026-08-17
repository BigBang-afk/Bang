"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { recordKarigarCashTransactionAction } from "@/lib/actions/karigars.actions";

const PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "OTHER"] as const;

export function KarigarCashDialog({ karigarId }: { karigarId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"CASH_PAID" | "CASH_RECEIVED">("CASH_PAID");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await recordKarigarCashTransactionAction({
        karigarId,
        transactionType,
        amount: Number(amount),
        paymentMethod,
        description: description || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Recorded. New balance: ${formatCurrency(result.data.balanceAfter)}.`);
      setOpen(false);
      setAmount("");
      setDescription("");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Wallet className="size-4" />
        Cash Paid / Received
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record karigar cash transaction</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="karigar-cash-type">Type</Label>
              <Select value={transactionType} onValueChange={(v) => setTransactionType(v as typeof transactionType)}>
                <SelectTrigger id="karigar-cash-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH_PAID">Cash Paid (business pays karigar)</SelectItem>
                  <SelectItem value="CASH_RECEIVED">Cash Received (from karigar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="karigar-cash-amount">Amount</Label>
              <Input id="karigar-cash-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="karigar-cash-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                <SelectTrigger id="karigar-cash-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="karigar-cash-description">Description</Label>
              <Input
                id="karigar-cash-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Making charge for job #123"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={pending || !amount || Number(amount) <= 0}>
              {pending ? "Recording..." : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
