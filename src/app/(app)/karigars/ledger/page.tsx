import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listAllGoldLedgerEntries } from "@/services/gold-ledger.service";
import { listAllPartyCashLedgerEntries } from "@/services/party-cash-ledger.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatWeight, formatCurrency, formatDateTime } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";

export const metadata = { title: "Karigar Ledger | Zarghoon Jewellers" };

export default async function KarigarLedgerPage() {
  await requirePermission(PERMISSIONS.KARIGARS_VIEW);

  const [gold, cash] = await Promise.all([
    listAllGoldLedgerEntries({ partyType: "KARIGAR", pageSize: 50 }),
    listAllPartyCashLedgerEntries({ partyType: "KARIGAR", pageSize: 50 }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Karigar Ledger</h1>
        <p className="text-sm text-muted-foreground">
          Every gold and cash transaction across every karigar — combined for reference, gold and cash are never
          added into one number.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gold Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {gold.rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No karigar gold transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Karigar</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Purity</TableHead>
                  <TableHead>Given</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gold.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell className="font-medium text-foreground">{row.partyName}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cash.rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No karigar cash transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Karigar</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cash.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell className="font-medium text-foreground">{row.partyName}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{row.transactionType.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className={row.debit.gt(0) ? "text-danger" : "text-muted-foreground"}>
                      {row.debit.gt(0) ? formatCurrency(row.debit) : "—"}
                    </TableCell>
                    <TableCell className={row.credit.gt(0) ? "text-success" : "text-muted-foreground"}>
                      {row.credit.gt(0) ? formatCurrency(row.credit) : "—"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {row.balanceAfter.gt(0)
                        ? `${formatCurrency(row.balanceAfter)} payable`
                        : row.balanceAfter.lt(0)
                          ? `${formatCurrency(row.balanceAfter.abs())} receivable`
                          : formatCurrency(0)}
                    </TableCell>
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
