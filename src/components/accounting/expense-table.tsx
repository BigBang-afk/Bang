import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VoidFinancialEntryDialog } from "@/components/accounting/void-financial-entry-dialog";
import { voidExpenseAction } from "@/lib/actions/expenses.actions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ExpenseRow } from "@/services/expense.service";

export function ExpenseTable({ rows, canManage }: { rows: ExpenseRow[]; canManage: boolean }) {
  if (rows.length === 0) {
    return <p className="px-4 py-16 text-center text-sm text-muted-foreground">No expenses match these filters.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Expense #</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          {canManage && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono text-xs">{row.expenseNumber}</TableCell>
            <TableCell>{row.category.name}</TableCell>
            <TableCell className="max-w-[240px] truncate" title={row.description}>
              {row.description}
              {row.vendorName && <span className="text-muted-foreground"> — {row.vendorName}</span>}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(row.expenseDate)}</TableCell>
            <TableCell className="text-muted-foreground">{row.paymentMethod.replace("_", " ")}</TableCell>
            <TableCell className="text-right font-mono text-danger">{formatCurrency(row.amount.toString())}</TableCell>
            <TableCell>
              {row.status === "ACTIVE" ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="neutral" title={row.voidReason ?? undefined}>
                  Voided
                </Badge>
              )}
            </TableCell>
            {canManage && (
              <TableCell>
                <div className="flex justify-end">
                  {row.status === "ACTIVE" && (
                    <VoidFinancialEntryDialog
                      entryNumber={row.expenseNumber}
                      entryId={row.id}
                      idField="expenseId"
                      action={voidExpenseAction}
                    />
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
