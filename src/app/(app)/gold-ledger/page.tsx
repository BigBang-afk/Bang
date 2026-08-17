import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listAllGoldLedgerEntries } from "@/services/gold-ledger.service";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatWeight, formatCurrency, formatDateTime } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";

export const metadata = { title: "Gold Transactions | Zarghoon Jewellers" };

export default async function GoldTransactionsPage() {
  await requirePermission(PERMISSIONS.GOLD_LEDGER_VIEW);
  const { rows, total } = await listAllGoldLedgerEntries({ pageSize: 100 });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Gold Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Every gold ledger entry across every karigar and supplier — {total} total.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-muted-foreground">No gold transactions recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Purity</TableHead>
                  <TableHead>Debit (Given)</TableHead>
                  <TableHead>Credit (Received)</TableHead>
                  <TableHead>Balance After</TableHead>
                  <TableHead>Gold Value</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell className="font-medium text-foreground">
                      {row.partyName} <span className="text-xs text-muted-foreground">({row.partyType === "KARIGAR" ? "Karigar" : "Supplier"})</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{row.transactionType.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{PURITY_LABELS[row.purity]}</TableCell>
                    <TableCell className={row.debit.gt(0) ? "text-gold" : "text-muted-foreground"}>
                      {row.debit.gt(0) ? formatWeight(row.debit) : "—"}
                    </TableCell>
                    <TableCell className={row.credit.gt(0) ? "text-success" : "text-muted-foreground"}>
                      {row.credit.gt(0) ? formatWeight(row.credit) : "—"}
                    </TableCell>
                    <TableCell className="font-mono">{formatWeight(row.balanceAfter)}</TableCell>
                    <TableCell className="text-muted-foreground">{row.goldValue ? formatCurrency(row.goldValue) : "—"}</TableCell>
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
