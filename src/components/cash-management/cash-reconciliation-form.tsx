"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { runCashReconciliationAction } from "@/lib/actions/cash-management.actions";
import type { CashReconciliationResult } from "@/services/reconciliation.service";

export function CashReconciliationForm() {
  const router = useRouter();
  const [physicalAmount, setPhysicalAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<CashReconciliationResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const response = await runCashReconciliationAction({
        physicalAmount: Number(physicalAmount),
        notes: notes || undefined,
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      setResult(response.data);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run cash reconciliation</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cash-recon-physical">Physical Cash Count</Label>
            <Input
              id="cash-recon-physical"
              type="number"
              min={0}
              step="0.01"
              value={physicalAmount}
              onChange={(e) => setPhysicalAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cash-recon-notes">Notes</Label>
            <Input id="cash-recon-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <Button className="self-start" onClick={handleSubmit} disabled={pending || physicalAmount === ""}>
          {pending ? "Reconciling..." : "Run Reconciliation"}
        </Button>

        {result && (
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <p className="text-sm text-muted-foreground">
                System: <span className="font-mono text-foreground">{formatCurrency(result.systemAmount)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Physical: <span className="font-mono text-foreground">{formatCurrency(result.physicalAmount)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Difference: <span className="font-mono text-foreground">{formatCurrency(result.difference)}</span>
              </p>
            </div>
            <div className="mt-2">
              <Badge variant={result.status === "MATCHED" ? "success" : "danger"}>
                {result.status === "MATCHED" ? "Matched" : "Reconciliation Required"}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
