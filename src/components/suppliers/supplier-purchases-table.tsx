import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatWeight, formatCurrency, formatDate } from "@/lib/format";
import { derivePurchasePaymentStatus } from "@/types/purchases";
import type { PurchaseListRow } from "@/services/purchase.service";

export function SupplierPurchasesTable({ rows }: { rows: PurchaseListRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">No purchases from this supplier yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Purchase #</TableHead>
          <TableHead>Date</TableHead>
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
