import Link from "next/link";
import { Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SegmentCustomerRow } from "@/services/customer-analytics.service";

export function SegmentCustomerTable({
  rows,
  emptyMessage,
}: {
  rows: SegmentCustomerRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Purchases</TableHead>
          <TableHead>Total Spending</TableHead>
          <TableHead>Outstanding</TableHead>
          <TableHead>Last Purchase</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono text-xs">{row.customerCode}</TableCell>
            <TableCell>
              <Link href={`/customers/${row.id}`} className="font-medium text-foreground hover:text-gold">
                {row.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{row.phone}</TableCell>
            <TableCell>{row.purchaseCount}</TableCell>
            <TableCell className="font-medium text-gold">{formatCurrency(row.totalSpending)}</TableCell>
            <TableCell className={Number(row.outstandingBalance) > 0 ? "text-warning" : "text-muted-foreground"}>
              {formatCurrency(row.outstandingBalance)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.lastPurchaseAt ? formatDate(row.lastPurchaseAt) : "Never"}
            </TableCell>
            <TableCell>
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" asChild title="View profile">
                  <Link href={`/customers/${row.id}`}>
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
