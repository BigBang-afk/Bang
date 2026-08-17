import Link from "next/link";
import { Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SupplierStatusBadge } from "@/components/suppliers/supplier-status-badge";
import { formatDate } from "@/lib/format";
import type { SupplierRow } from "@/services/supplier.service";

export function SupplierTable({ rows }: { rows: SupplierRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-medium text-foreground">No suppliers match these filters.</p>
        <p className="text-sm text-muted-foreground">
          Try widening your search, or{" "}
          <Link href="/suppliers/add" className="text-gold hover:underline">
            add a new supplier
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
          <TableHead>Supplier Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono text-xs">{row.supplierCode}</TableCell>
            <TableCell>
              <Link href={`/suppliers/${row.id}`} className="font-medium text-foreground hover:text-gold">
                {row.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{row.companyName ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">{row.phone}</TableCell>
            <TableCell>
              <SupplierStatusBadge status={row.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end">
                <Button variant="ghost" size="icon" asChild title="View profile">
                  <Link href={`/suppliers/${row.id}`}>
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
