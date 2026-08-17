import Link from "next/link";
import { Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { KarigarStatusBadge, KarigarSpecializationBadge } from "@/components/karigars/karigar-status-badge";
import { formatDate } from "@/lib/format";
import type { KarigarRow } from "@/services/karigar.service";

export function KarigarTable({ rows }: { rows: KarigarRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-medium text-foreground">No karigars match these filters.</p>
        <p className="text-sm text-muted-foreground">
          Try widening your search, or{" "}
          <Link href="/karigars/add" className="text-gold hover:underline">
            add a new karigar
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Karigar Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Specialization</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono text-xs">{row.karigarCode}</TableCell>
            <TableCell>
              <Link href={`/karigars/${row.id}`} className="font-medium text-foreground hover:text-gold">
                {row.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{row.phone}</TableCell>
            <TableCell>
              <KarigarSpecializationBadge specialization={row.specialization} />
            </TableCell>
            <TableCell>
              <KarigarStatusBadge status={row.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end">
                <Button variant="ghost" size="icon" asChild title="View profile">
                  <Link href={`/karigars/${row.id}`}>
                    <Eye className="size-4" />
                  </Link>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
