import { requirePermission, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listCashReconciliations, getLatestCashReconciliation } from "@/services/reconciliation.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { CashReconciliationForm } from "@/components/cash-management/cash-reconciliation-form";
import { CashAdjustmentDialog } from "@/components/cash-management/cash-adjustment-dialog";

export const metadata = { title: "Cash Reconciliation | Zarghoon Jewellers" };

export default async function CashReconciliationPage() {
  const user = await requirePermission(PERMISSIONS.CASH_VIEW);
  const canReconcile = await userHasPermission(user, PERMISSIONS.CASH_RECONCILE);

  const [history, latest] = await Promise.all([listCashReconciliations(), getLatestCashReconciliation()]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Cash Reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Compares the system&apos;s computed cash balance against a physical till count. A mismatch is flagged —
          never auto-corrected.
        </p>
      </div>

      {latest && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Latest: System <span className="font-mono text-foreground">{formatCurrency(latest.systemAmount)}</span> vs. Physical{" "}
              <span className="font-mono text-foreground">{formatCurrency(latest.physicalAmount)}</span>
            </p>
            <Badge variant={latest.status === "MATCHED" ? "success" : "danger"}>
              {latest.status === "MATCHED" ? "Matched" : "Reconciliation Required"}
            </Badge>
          </CardContent>
        </Card>
      )}

      {canReconcile && <CashReconciliationForm />}
      {canReconcile && <CashAdjustmentDialog />}

      <Card>
        <CardHeader>
          <CardTitle>Reconciliation History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No reconciliation runs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Physical</TableHead>
                  <TableHead>Difference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(row.systemAmount)}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(row.physicalAmount)}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(row.difference)}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "MATCHED" ? "success" : "danger"}>
                        {row.status === "MATCHED" ? "Matched" : "Reconciliation Required"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.notes ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.createdBy.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
