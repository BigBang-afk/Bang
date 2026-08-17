import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VoidFinancialEntryDialog } from "@/components/accounting/void-financial-entry-dialog";
import { voidIncomeAction } from "@/lib/actions/income.actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { INCOME_TYPE_LABELS } from "@/types/accounting";
import type { IncomeRow } from "@/services/income.service";

export function IncomeTable({ rows, canManage }: { rows: IncomeRow[]; canManage: boolean }) {
  if (rows.length === 0) {
    return <p className="px-4 py-16 text-center text-sm text-muted-foreground">No income entries match these filters.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Income #</TableHead>
          <TableHead>Type</TableHead>
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
            <TableCell className="font-mono text-xs">{row.incomeNumber}</TableCell>
            <TableCell>{INCOME_TYPE_LABELS[row.incomeType]}</TableCell>
            <TableCell className="max-w-[280px] truncate" title={row.description}>
              {row.description}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(row.incomeDate)}</TableCell>
            <TableCell className="text-muted-foreground">{row.paymentMethod.replace("_", " ")}</TableCell>
            <TableCell className="text-right font-mono text-success">{formatCurrency(row.amount.toString())}</TableCell>
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
                      entryNumber={row.incomeNumber}
                      entryId={row.id}
                      idField="incomeId"
                      action={voidIncomeAction}
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
