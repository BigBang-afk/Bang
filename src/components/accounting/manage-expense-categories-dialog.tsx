"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createExpenseCategoryAction, setExpenseCategoryActiveAction } from "@/lib/actions/expenses.actions";
import type { ExpenseCategoryRow } from "@/services/expense-category.service";

export function ManageExpenseCategoriesDialog({ categories }: { categories: ExpenseCategoryRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const result = await createExpenseCategoryAction({ name });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Category "${result.data.name}" added.`);
      setName("");
      router.refresh();
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      const result = await setExpenseCategoryActiveAction({ id, isActive: !isActive });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Settings2 className="size-4" />
        Categories
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expense categories</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
            <Button onClick={handleAdd} disabled={pending || !name.trim()}>
              Add
            </Button>
          </div>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{c.name}</span>
                  {c.isSystem && (
                    <Badge variant="neutral" className="text-[10px]">
                      Starter
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleToggle(c.id, c.isActive)} disabled={pending}>
                  {c.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
