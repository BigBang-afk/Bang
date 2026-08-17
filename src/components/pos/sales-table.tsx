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
import { SaleStatusBadge, PaymentStatusBadge } from "@/components/pos/sale-status-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import type { SaleListRow } from "@/services/sale.service";

export function SalesTable({ rows }: { rows: SaleListRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-medium text-foreground">No sales match these filters.</p>
        <p className="text-sm text-muted-foreground">
          Try widening your search, or{" "}
          <Link href="/pos" className="text-gold hover:underline">
            start a new sale
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
          <TableHead>Invoice</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Subtotal</TableHead>
          <TableHead>Discount</TableHead>
          <TableHead>Grand Total</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created By</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono text-xs">
              {row.invoice ? formatInvoiceNumber(row.invoice.sequence) : "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDateTime(row.saleDate)}</TableCell>
            <TableCell>
              {row.customer ? (
                <>
                  <p className="font-medium text-foreground">{row.customer.name}</p>
                  <p className="text-xs text-muted-foreground">{row.customer.phone}</p>
                </>
              ) : (
                <span className="text-muted-foreground">Walk-in</span>
              )}
            </TableCell>
            <TableCell>{row._count.items}</TableCell>
            <TableCell>{formatCurrency(row.subtotal.toString())}</TableCell>
            <TableCell className="text-muted-foreground">-{formatCurrency(row.discount.toString())}</TableCell>
            <TableCell className="font-medium text-gold">{formatCurrency(row.grandTotal.toString())}</TableCell>
            <TableCell>{formatCurrency(row.paidAmount.toString())}</TableCell>
            <TableCell className={Number(row.balanceAmount) > 0 ? "text-warning" : "text-muted-foreground"}>
              {formatCurrency(row.balanceAmount.toString())}
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                <SaleStatusBadge status={row.status} />
                <PaymentStatusBadge balanceAmount={row.balanceAmount.toString()} />
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{row.createdBy.name}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end">
                <Button variant="ghost" size="icon" asChild title="View">
                  <Link href={`/pos/sales/${row.id}`}>
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
