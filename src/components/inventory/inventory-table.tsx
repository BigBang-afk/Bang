import Image from "next/image";
import Link from "next/link";
import { ImageOff, Eye, Pencil, Printer, History } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StockStatusBadge } from "@/components/inventory/stock-status-badge";
import { formatCurrency, formatDate, formatWeight } from "@/lib/format";
import { formatBarcodeCode } from "@/lib/barcode-code";
import { PURITY_LABELS } from "@/types/gold";
import type { InventoryListRow } from "@/services/inventory-item.service";

export function InventoryTable({ rows }: { rows: InventoryListRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-medium text-foreground">No stock matches these filters.</p>
        <p className="text-sm text-muted-foreground">
          Try widening your search, or{" "}
          <Link href="/inventory/add" className="text-gold hover:underline">
            add new stock
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
          <TableHead>Image</TableHead>
          <TableHead>Barcode</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Purity</TableHead>
          <TableHead>Net Wt.</TableHead>
          <TableHead>Wastage</TableHead>
          <TableHead>Gross Wt.</TableHead>
          <TableHead>Gold Rate</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Selling Price</TableHead>
          <TableHead>Expected Profit</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-elevated">
                {row.product.imageUrl ? (
                  <Image
                    src={row.product.imageUrl}
                    alt={row.product.name}
                    width={40}
                    height={40}
                    className="size-10 object-cover"
                  />
                ) : (
                  <ImageOff className="size-4 text-muted-foreground" />
                )}
              </div>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {row.barcode ? formatBarcodeCode(row.barcode.sequence) : "—"}
            </TableCell>
            <TableCell>
              <Link href={`/inventory/${row.id}`} className="font-medium text-foreground hover:text-gold">
                {row.product.name}
              </Link>
              {row.product.designNumber && (
                <p className="text-xs text-muted-foreground">#{row.product.designNumber}</p>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{row.product.category.name}</TableCell>
            <TableCell>{PURITY_LABELS[row.purity]}</TableCell>
            <TableCell>{formatWeight(row.netWeight.toString())}</TableCell>
            <TableCell className="text-muted-foreground">
              {row.wastagePercent ? `${row.wastagePercent.toString()}%` : formatWeight(row.wastageWeight.toString())}
            </TableCell>
            <TableCell>{formatWeight(row.grossWeight.toString())}</TableCell>
            <TableCell className="text-muted-foreground">{formatCurrency(row.goldRatePerGram.toString())}</TableCell>
            <TableCell>{formatCurrency(row.totalCost.toString())}</TableCell>
            <TableCell className="font-medium text-gold">{formatCurrency(row.sellingPrice.toString())}</TableCell>
            <TableCell
              className={row.expectedProfit.toString().startsWith("-") ? "text-danger" : "text-success"}
            >
              {formatCurrency(row.expectedProfit.toString())}
            </TableCell>
            <TableCell>
              <StockStatusBadge status={row.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon" asChild title="View">
                  <Link href={`/inventory/${row.id}`}>
                    <Eye className="size-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" asChild title="Edit">
                  <Link href={`/inventory/${row.id}/edit`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" asChild title="Print barcode">
                  <Link href={`/inventory/${row.id}/print/barcode`}>
                    <Printer className="size-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" asChild title="Stock history">
                  <Link href={`/inventory/${row.id}#history`}>
                    <History className="size-4" />
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
