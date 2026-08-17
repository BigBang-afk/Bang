import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatWeight, formatCurrency, formatDateTime } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";
import type { GoldLedgerEntryRow } from "@/services/gold-ledger.service";

export function KarigarGoldLedgerTable({ rows }: { rows: GoldLedgerEntryRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">No gold transactions yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Purity</TableHead>
          <TableHead>Given (Debit)</TableHead>
          <TableHead>Received (Credit)</TableHead>
          <TableHead>Balance After</TableHead>
          <TableHead>Gold Value</TableHead>
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
            <TableCell>{PURITY_LABELS[row.purity]}</TableCell>
            <TableCell className={row.debit.gt(0) ? "font-medium text-gold" : "text-muted-foreground"}>
              {row.debit.gt(0) ? formatWeight(row.debit) : "—"}
            </TableCell>
            <TableCell className={row.credit.gt(0) ? "font-medium text-success" : "text-muted-foreground"}>
              {row.credit.gt(0) ? formatWeight(row.credit) : "—"}
            </TableCell>
            <TableCell className="font-mono">{formatWeight(row.balanceAfter)}</TableCell>
            <TableCell className="text-muted-foreground">{row.goldValue ? formatCurrency(row.goldValue) : "—"}</TableCell>
            <TableCell className="text-muted-foreground">{row.description ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">{row.createdBy.name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
