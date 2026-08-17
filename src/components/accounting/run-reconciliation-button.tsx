"use client";

import { useState, useTransition } from "react";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runFinancialReconciliationAction } from "@/lib/actions/financial-reports.actions";
import type { FullFinancialReconciliation, ReconciliationCheckResult } from "@/services/financial-reconciliation.service";

const CHECK_LABELS: Record<keyof Omit<FullFinancialReconciliation, "overallStatus">, string> = {
  sales: "Sales totals vs. customer credit extended",
  customerLedger: "Customer ledger balance vs. ledger sum",
  supplierLedger: "Supplier cash ledger balance vs. ledger sum",
  karigarLedger: "Karigar cash ledger balance vs. ledger sum",
  cash: "Cash balance — independent recomputation",
  gold: "Gold ledger balance vs. ledger sum",
  inventory: "Inventory sold-status consistency",
};

function CheckRow({ label, result }: { label: string; result: ReconciliationCheckResult }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-elevated px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Badge variant={result.status === "OK" ? "success" : "danger"}>
          {result.status === "OK" ? "OK" : "FINANCIAL INTEGRITY ERROR"}
        </Badge>
      </div>
      {result.status !== "OK" && (
        <ul className="list-inside list-disc text-xs text-danger">
          {result.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RunReconciliationButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FullFinancialReconciliation | null>(null);

  function handleRun() {
    startTransition(async () => {
      const response = await runFinancialReconciliationAction();
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      setResult(response.data);
      toast[response.data.overallStatus === "OK" ? "success" : "error"](
        response.data.overallStatus === "OK" ? "All checks passed." : "Financial integrity error(s) found.",
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={handleRun} disabled={pending}>
          <RefreshCcw className="size-4" />
          {pending ? "Running..." : "Run Reconciliation"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Never auto-corrects anything found — a mismatch is reported for investigation only.
        </p>
      </div>

      {result && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Result</CardTitle>
            <Badge variant={result.overallStatus === "OK" ? "success" : "danger"} className="text-sm">
              {result.overallStatus === "OK" ? "All Checks Passed" : "Financial Integrity Error"}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(Object.keys(CHECK_LABELS) as (keyof typeof CHECK_LABELS)[]).map((key) => (
              <CheckRow key={key} label={CHECK_LABELS[key]} result={result[key]} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
