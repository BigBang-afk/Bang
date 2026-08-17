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
import { createExpenseAction } from "@/lib/actions/expenses.actions";
import { EXPENSE_INCOME_PAYMENT_METHODS } from "@/types/accounting";
import type { ExpenseCategoryRow } from "@/services/expense-category.service";

const todayInputValue = () => new Date().toISOString().slice(0, 10);

export function AddExpenseDialog({ categories }: { categories: ExpenseCategoryRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof EXPENSE_INCOME_PAYMENT_METHODS)[number]>("CASH");
  const [expenseDate, setExpenseDate] = useState(todayInputValue());
  const [reference, setReference] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setCategoryId("");
    setDescription("");
    setAmount("");
    setPaymentMethod("CASH");
    setExpenseDate(todayInputValue());
    setReference("");
    setVendorName("");
    setNotes("");
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createExpenseAction({
        categoryId,
        description,
        amount: Number(amount),
        paymentMethod,
        expenseDate,
        reference: reference || undefined,
        vendorName: vendorName || undefined,
        notes: notes || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Expense ${result.data.expenseNumber} recorded.`);
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const canSubmit = categoryId && description.trim() && Number(amount) > 0 && expenseDate;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add Expense
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="expense-category">Expense Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="expense-category">
                  <SelectValue placeholder="Select a category" />
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
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="expense-description">Description</Label>
              <Input id="expense-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Electricity bill — August" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input id="expense-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="expense-date">Date</Label>
              <Input id="expense-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="expense-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                <SelectTrigger id="expense-method">
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
            <div className="grid gap-1.5">
              <Label htmlFor="expense-reference">Reference (optional)</Label>
              <Input id="expense-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="expense-vendor">Vendor (optional)</Label>
              <Input id="expense-vendor" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="expense-notes">Notes (optional)</Label>
              <Input id="expense-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={pending || !canSubmit}>
              {pending ? "Saving..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
