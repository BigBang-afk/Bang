import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { PartyCashLedgerEntryRow } from "@/services/party-cash-ledger.service";

export function PartyCashLedgerTable({ rows }: { rows: PartyCashLedgerEntryRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">No cash transactions yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Debit (Payable +)</TableHead>
          <TableHead>Credit (Payable −)</TableHead>
          <TableHead>Balance After</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>By</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
            <TableCell>
              <Badge variant="neutral">{row.transactionType.replace("_", " ")}</Badge>
            </TableCell>
            <TableCell className={row.debit.gt(0) ? "font-medium text-danger" : "text-muted-foreground"}>
              {row.debit.gt(0) ? formatCurrency(row.debit) : "—"}
            </TableCell>
            <TableCell className={row.credit.gt(0) ? "font-medium text-success" : "text-muted-foreground"}>
              {row.credit.gt(0) ? formatCurrency(row.credit) : "—"}
            </TableCell>
            <TableCell className="font-mono">
              {row.balanceAfter.gt(0)
                ? `${formatCurrency(row.balanceAfter)} payable`
                : row.balanceAfter.lt(0)
                  ? `${formatCurrency(row.balanceAfter.abs())} receivable`
                  : formatCurrency(0)}
            </TableCell>
            <TableCell className="text-muted-foreground">{row.description ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">{row.createdBy.name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
