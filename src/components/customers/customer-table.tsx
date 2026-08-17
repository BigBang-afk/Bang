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
import { CustomerStatusBadge, CustomerTypeBadge } from "@/components/customers/customer-status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CustomerListRow } from "@/services/customer.service";

export function CustomerTable({ rows }: { rows: CustomerListRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-medium text-foreground">No customers match these filters.</p>
        <p className="text-sm text-muted-foreground">
          Try widening your search, or{" "}
          <Link href="/customers/add" className="text-gold hover:underline">
            add a new customer
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
          <TableHead>Customer Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Purchases</TableHead>
          <TableHead>Total Spending</TableHead>
          <TableHead>Outstanding</TableHead>
          <TableHead>Last Purchase</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
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
            <TableCell>
              <CustomerTypeBadge customerType={row.customerType} />
            </TableCell>
            <TableCell>{row.purchaseCount}</TableCell>
            <TableCell className="font-medium text-gold">{formatCurrency(row.totalSpending)}</TableCell>
            <TableCell className={Number(row.outstandingBalance) > 0 ? "text-warning" : "text-muted-foreground"}>
              {formatCurrency(row.outstandingBalance)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.lastPurchaseAt ? formatDate(row.lastPurchaseAt) : "—"}
            </TableCell>
            <TableCell>
              <CustomerStatusBadge status={row.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end">
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
