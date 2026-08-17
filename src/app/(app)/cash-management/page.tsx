import { requirePermission, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listCashTransactions, getCashSummary } from "@/services/cash-transaction.service";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { RecordExpenseDialog } from "@/components/cash-management/record-expense-dialog";

export const metadata = { title: "Cash Transactions | Zarghoon Jewellers" };

export default async function CashTransactionsPage() {
  const user = await requirePermission(PERMISSIONS.CASH_VIEW);
  const canManage = await userHasPermission(user, PERMISSIONS.CASH_MANAGE);

  const [summary, { rows, total }] = await Promise.all([
    getCashSummary(),
    listCashTransactions({ pageSize: 50 }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Cash Transactions</h1>
          <p className="text-sm text-muted-foreground">The company-wide physical cash book — {total} transactions.</p>
        </div>
        {canManage && <RecordExpenseDialog />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Opening Balance</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">{formatCurrency(summary.openingBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total In</p>
            <p className="mt-1 font-display text-xl font-semibold text-success">{formatCurrency(summary.totalIn)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Out</p>
            <p className="mt-1 font-display text-xl font-semibold text-danger">{formatCurrency(summary.totalOut)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Closing Balance</p>
            <p className="mt-1 font-display text-xl font-semibold text-gold">{formatCurrency(summary.closingBalance)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-muted-foreground">No cash transactions recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{row.transactionType.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.direction === "IN" ? "success" : "danger"}>{row.direction}</Badge>
                    </TableCell>
                    <TableCell className={row.direction === "IN" ? "font-medium text-success" : "font-medium text-danger"}>
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.paymentMethod.replace("_", " ")}</TableCell>
                    <TableCell className="text-muted-foreground">{row.description ?? "—"}</TableCell>
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
