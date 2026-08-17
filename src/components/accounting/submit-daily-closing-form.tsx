"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitDailyClosingAction } from "@/lib/actions/daily-closing.actions";
import { formatCurrency } from "@/lib/format";

export function SubmitDailyClosingForm({ businessDate, expectedClosingCash }: { businessDate: string; expectedClosingCash: string }) {
  const router = useRouter();
  const [physicalCashAmount, setPhysicalCashAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const difference =
    physicalCashAmount !== "" ? Number(physicalCashAmount) - Number(expectedClosingCash) : null;

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitDailyClosingAction({
        businessDate,
        physicalCashAmount: Number(physicalCashAmount),
        notes: notes || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.data.status === "CLOSED" ? "Day closed." : "Submitted for review.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit today&apos;s physical cash count</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="physical-cash">Physical Cash</Label>
            <Input
              id="physical-cash"
              type="number"
              min={0}
              step="0.01"
              value={physicalCashAmount}
              onChange={(e) => setPhysicalCashAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="closing-notes">Notes (optional)</Label>
            <Input id="closing-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        {difference !== null && (
          <p className={`text-sm font-medium ${difference === 0 ? "text-success" : difference < 0 ? "text-danger" : "text-warning"}`}>
            {difference === 0
              ? "Matches expected closing cash exactly."
              : difference < 0
                ? `CASH SHORTAGE: ${formatCurrency(Math.abs(difference))}`
                : `CASH EXCESS: ${formatCurrency(difference)}`}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Never auto-adjusted — a difference is recorded and flagged for review, not silently corrected.
        </p>
        <div>
          <Button onClick={handleSubmit} disabled={pending || physicalCashAmount === ""}>
            {pending ? "Submitting..." : "Submit Closing"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
