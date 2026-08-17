"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createIncomeAction } from "@/lib/actions/income.actions";
import { EXPENSE_INCOME_PAYMENT_METHODS, INCOME_TYPES, INCOME_TYPE_LABELS } from "@/types/accounting";

const todayInputValue = () => new Date().toISOString().slice(0, 10);

export function AddIncomeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [incomeType, setIncomeType] = useState<(typeof INCOME_TYPES)[number]>("OTHER_INCOME");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof EXPENSE_INCOME_PAYMENT_METHODS)[number]>("CASH");
  const [incomeDate, setIncomeDate] = useState(todayInputValue());
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setIncomeType("OTHER_INCOME");
    setDescription("");
    setAmount("");
    setPaymentMethod("CASH");
    setIncomeDate(todayInputValue());
    setReference("");
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createIncomeAction({
        incomeType,
        description,
        amount: Number(amount),
        paymentMethod,
        incomeDate,
        reference: reference || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Income ${result.data.incomeNumber} recorded.`);
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const canSubmit = description.trim() && Number(amount) > 0 && incomeDate;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add Income
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add income</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="income-type">Type</Label>
              <Select value={incomeType} onValueChange={(v) => setIncomeType(v as typeof incomeType)}>
                <SelectTrigger id="income-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {INCOME_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="income-date">Date</Label>
              <Input id="income-date" type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="income-description">Description</Label>
              <Input id="income-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Repair service charge" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="income-amount">Amount</Label>
              <Input id="income-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="income-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                <SelectTrigger id="income-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_INCOME_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="income-reference">Reference (optional)</Label>
              <Input id="income-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={pending || !canSubmit}>
              {pending ? "Saving..." : "Add Income"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
