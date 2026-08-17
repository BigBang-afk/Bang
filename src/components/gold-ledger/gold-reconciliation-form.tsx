"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatWeight } from "@/lib/format";
import { GOLD_PURITIES, PURITY_LABELS } from "@/types/gold";
import { runGoldReconciliationAction } from "@/lib/actions/gold-ledger.actions";
import type { GoldReconciliationResult } from "@/services/reconciliation.service";

export function GoldReconciliationForm() {
  const router = useRouter();
  const [purity, setPurity] = useState<(typeof GOLD_PURITIES)[number]>("K21");
  const [physicalWeight, setPhysicalWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<GoldReconciliationResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const response = await runGoldReconciliationAction({
        purity,
        physicalWeight: Number(physicalWeight),
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
        <CardTitle>Run gold reconciliation</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="recon-purity">Purity</Label>
            <Select value={purity} onValueChange={(v) => setPurity(v as typeof purity)}>
              <SelectTrigger id="recon-purity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOLD_PURITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PURITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="recon-physical">Physical Weight (g)</Label>
            <Input
              id="recon-physical"
              type="number"
              min={0}
              step="0.001"
              value={physicalWeight}
              onChange={(e) => setPhysicalWeight(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="recon-notes">Notes</Label>
            <Input id="recon-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <Button className="self-start" onClick={handleSubmit} disabled={pending || physicalWeight === ""}>
          {pending ? "Reconciling..." : "Run Reconciliation"}
        </Button>

        {result && (
          <div className="rounded-md border border-border bg-surface-elevated p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <p className="text-sm text-muted-foreground">
                System: <span className="font-mono text-foreground">{formatWeight(result.systemWeight)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Physical: <span className="font-mono text-foreground">{formatWeight(result.physicalWeight)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Difference: <span className="font-mono text-foreground">{formatWeight(result.differenceWeight)}</span>
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
