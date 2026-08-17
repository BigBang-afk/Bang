import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GoldPositionList } from "@/components/ledger/gold-position";
import type { GoldPartySummaryRow } from "@/services/gold-ledger.service";

export function PartyGoldSummaryTable({
  rows,
  profileBasePath,
}: {
  rows: GoldPartySummaryRow[];
  profileBasePath: string;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">No party currently holds a non-zero gold balance.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Gold Position</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.partyId}>
            <TableCell className="font-mono text-xs">{row.partyCode}</TableCell>
            <TableCell>
              <Link href={`${profileBasePath}/${row.partyId}`} className="font-medium text-foreground hover:text-gold">
                {row.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{row.phone}</TableCell>
            <TableCell>
              <GoldPositionList positions={row.positions} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
