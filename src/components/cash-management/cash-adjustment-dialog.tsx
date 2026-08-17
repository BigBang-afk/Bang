"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { recordCashAdjustmentAction } from "@/lib/actions/cash-management.actions";

const PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "OTHER"] as const;

export function CashAdjustmentDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await recordCashAdjustmentAction({
        amount: Number(amount),
        direction,
        paymentMethod,
        reason,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cash adjustment recorded.");
      setOpen(false);
      setAmount("");
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Scale className="size-4" />
        Record Cash Adjustment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a cash adjustment</DialogTitle>
            <DialogDescription>A manual, explicit correction — never automatic. Requires a reason.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cash-adj-amount">Amount</Label>
                <Input id="cash-adj-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cash-adj-direction">Direction</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
                  <SelectTrigger id="cash-adj-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Increase (cash found)</SelectItem>
                    <SelectItem value="OUT">Decrease (cash missing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cash-adj-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                <SelectTrigger id="cash-adj-method">
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
              <Label htmlFor="cash-adj-reason">Reason</Label>
              <Input id="cash-adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Till count correction" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={pending || !amount || Number(amount) <= 0 || !reason.trim()}>
              {pending ? "Recording..." : "Record Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
