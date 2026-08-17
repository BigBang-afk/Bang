import { requirePermission, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listGoldReconciliations, getLatestGoldReconciliationByPurity } from "@/services/reconciliation.service";
import { listKarigars } from "@/services/karigar.service";
import { listSuppliers } from "@/services/supplier.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatWeight, formatDateTime } from "@/lib/format";
import { PURITY_LABELS, GOLD_PURITIES } from "@/types/gold";
import { GoldReconciliationForm } from "@/components/gold-ledger/gold-reconciliation-form";
import { GoldAdjustmentDialog } from "@/components/gold-ledger/gold-adjustment-dialog";

export const metadata = { title: "Gold Reconciliation | Zarghoon Jewellers" };

export default async function GoldReconciliationPage() {
  const user = await requirePermission(PERMISSIONS.GOLD_LEDGER_VIEW);
  const canReconcile = await userHasPermission(user, PERMISSIONS.GOLD_LEDGER_RECONCILE);

  const [history, latestByPurity, karigars, suppliers] = await Promise.all([
    listGoldReconciliations(),
    getLatestGoldReconciliationByPurity(),
    listKarigars({ pageSize: 100 }),
    listSuppliers({ pageSize: 100 }),
  ]);

  const parties = [
    ...karigars.rows.map((k) => ({ partyType: "KARIGAR" as const, partyId: k.id, label: `${k.name} (Karigar)` })),
    ...suppliers.rows.map((s) => ({ partyType: "SUPPLIER" as const, partyId: s.id, label: `${s.name} (Supplier)` })),
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Gold Reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Compares the system&apos;s computed gold balance per purity against a physical stock-take. A mismatch is
          flagged — never auto-corrected.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {GOLD_PURITIES.map((purity) => {
          const latest = latestByPurity[purity];
          return (
            <Card key={purity}>
              <CardContent className="py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{PURITY_LABELS[purity]}</p>
                {latest ? (
                  <>
                    <p className="mt-1 font-mono text-sm text-foreground">{formatWeight(latest.differenceWeight)} diff</p>
                    <Badge variant={latest.status === "MATCHED" ? "success" : "danger"} className="mt-1">
                      {latest.status === "MATCHED" ? "Matched" : "Required"}
                    </Badge>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Not yet run</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {canReconcile && <GoldReconciliationForm />}
      {canReconcile && parties.length > 0 && <GoldAdjustmentDialog parties={parties} />}

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
                  <TableHead>Purity</TableHead>
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
                    <TableCell>{PURITY_LABELS[row.purity]}</TableCell>
                    <TableCell className="font-mono">{formatWeight(row.systemWeight)}</TableCell>
                    <TableCell className="font-mono">{formatWeight(row.physicalWeight)}</TableCell>
                    <TableCell className="font-mono">{formatWeight(row.differenceWeight)}</TableCell>
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
