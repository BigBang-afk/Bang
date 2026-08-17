import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { PartyCashSummaryRow } from "@/services/party-cash-ledger.service";

export function PartyCashSummaryTable({
  rows,
  profileBasePath,
}: {
  rows: PartyCashSummaryRow[];
  profileBasePath: (row: PartyCashSummaryRow) => string;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing to show here.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Party Type</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Payable</TableHead>
          <TableHead>Receivable</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.partyType}-${row.partyId}`}>
            <TableCell className="text-muted-foreground">{row.partyType === "KARIGAR" ? "Karigar" : "Supplier"}</TableCell>
            <TableCell className="font-mono text-xs">{row.partyCode}</TableCell>
            <TableCell>
              <Link href={profileBasePath(row)} className="font-medium text-foreground hover:text-gold">
                {row.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{row.phone}</TableCell>
            <TableCell className={Number(row.payable) > 0 ? "font-medium text-danger" : "text-muted-foreground"}>
              {Number(row.payable) > 0 ? formatCurrency(row.payable) : "—"}
            </TableCell>
            <TableCell className={Number(row.receivable) > 0 ? "font-medium text-success" : "text-muted-foreground"}>
              {Number(row.receivable) > 0 ? formatCurrency(row.receivable) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
