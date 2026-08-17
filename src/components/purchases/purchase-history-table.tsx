import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatWeight, formatCurrency, formatDate } from "@/lib/format";
import { derivePurchasePaymentStatus } from "@/types/purchases";
import type { PurchaseListRow } from "@/services/purchase.service";

export function PurchaseHistoryTable({ rows }: { rows: PurchaseListRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-medium text-foreground">No purchases match these filters.</p>
        <p className="text-sm text-muted-foreground">
          Try widening your search, or{" "}
          <Link href="/purchases" className="text-gold hover:underline">
            record a new purchase
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
          <TableHead>Purchase Number</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Gross Weight</TableHead>
          <TableHead>Total Cost</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const status = derivePurchasePaymentStatus(row.paidAmount, row.grandTotal);
          return (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">
                <Link href={`/purchases/${row.id}`} className="text-foreground hover:text-gold">
                  {row.purchaseNumber}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(row.purchaseDate)}</TableCell>
              <TableCell>
                <Link href={`/suppliers/${row.supplierId}`} className="text-foreground hover:text-gold">
                  {row.supplierName}
                </Link>
              </TableCell>
              <TableCell>{row.itemCount}</TableCell>
              <TableCell className="font-mono">{formatWeight(row.grossWeight)}</TableCell>
              <TableCell className="font-medium text-gold">{formatCurrency(row.grandTotal)}</TableCell>
              <TableCell className="text-success">{formatCurrency(row.paidAmount)}</TableCell>
              <TableCell className={Number(row.balanceAmount) > 0 ? "text-danger" : "text-muted-foreground"}>
                {formatCurrency(row.balanceAmount)}
              </TableCell>
              <TableCell>
                <Badge variant={status === "PAID" ? "success" : status === "PARTIALLY_PAID" ? "warning" : "danger"}>
                  {status.replace("_", " ")}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
