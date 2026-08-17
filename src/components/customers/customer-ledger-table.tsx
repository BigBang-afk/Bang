import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { LEDGER_TRANSACTION_TYPE_LABELS } from "@/types/customers";
import type { LedgerEntryRow } from "@/services/customer-ledger.service";

export function CustomerLedgerTable({
  rows,
  showCustomer,
}: {
  rows: (LedgerEntryRow & { customer?: { id: string; name: string; phone: string } })[];
  showCustomer?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-medium text-foreground">No ledger entries yet.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          {showCustomer && <TableHead>Customer</TableHead>}
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Debit</TableHead>
          <TableHead>Credit</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Recorded By</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
            {showCustomer && row.customer && (
              <TableCell>
                <p className="font-medium text-foreground">{row.customer.name}</p>
                <p className="text-xs text-muted-foreground">{row.customer.phone}</p>
              </TableCell>
            )}
            <TableCell>
              <Badge variant={row.transactionType === "SALE" ? "warning" : "success"}>
                {LEDGER_TRANSACTION_TYPE_LABELS[row.transactionType]}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.description ?? `${row.referenceType} ${row.referenceId.slice(0, 8)}`}
            </TableCell>
            <TableCell>{Number(row.debit) > 0 ? formatCurrency(row.debit.toString()) : "—"}</TableCell>
            <TableCell>{Number(row.credit) > 0 ? formatCurrency(row.credit.toString()) : "—"}</TableCell>
            <TableCell className="font-medium text-foreground">{formatCurrency(row.balanceAfter.toString())}</TableCell>
            <TableCell className="text-muted-foreground">{row.createdBy.name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
