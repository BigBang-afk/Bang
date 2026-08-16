import Link from "next/link";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getOldStock } from "@/services/inventory-item.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBarcodeCode } from "@/lib/barcode-code";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Old Stock | Zarghoon Jewellers" };

const THRESHOLDS = [30, 60, 90, 180] as const;

export default async function OldStockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);
  const params = await searchParams;
  const rawDays = typeof params.days === "string" ? Number.parseInt(params.days, 10) : 30;
  const days = THRESHOLDS.includes(rawDays as (typeof THRESHOLDS)[number]) ? rawDays : 30;

  const rows = await getOldStock(days);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Old Stock</h1>
        <p className="text-sm text-muted-foreground">
          Unsold items still in stock, so you can decide what needs attention — nothing here is
          automatically flagged as &quot;dead&quot;.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {THRESHOLDS.map((threshold) => (
          <Button key={threshold} variant={threshold === days ? "default" : "secondary"} size="sm" asChild>
            <Link href={`/inventory/old-stock?days=${threshold}`}>{threshold}+ days</Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No stock has been sitting for {days}+ days.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Days in Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/inventory/${row.id}`} className="hover:text-gold">
                        {row.barcodeSequence ? formatBarcodeCode(row.barcodeSequence) : "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{row.productName}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(row.totalCost.toString())}</TableCell>
                    <TableCell>{formatCurrency(row.sellingPrice.toString())}</TableCell>
                    <TableCell className={cn(row.daysInStock >= 180 && "font-semibold text-warning")}>
                      {row.daysInStock} days
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
