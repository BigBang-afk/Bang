import Link from "next/link";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listStockMovements } from "@/services/stock-movement.service";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/inventory/pagination";
import { formatBarcodeCode } from "@/lib/barcode-code";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Stock Movements | Zarghoon Jewellers" };

const PAGE_SIZE = 30;

const MOVEMENT_LABELS: Record<string, string> = {
  STOCK_CREATED: "Created",
  STOCK_UPDATED: "Updated",
  STOCK_RESERVED: "Reserved",
  STOCK_SOLD: "Sold",
  STOCK_RETURNED: "Returned",
  STOCK_ADJUSTED: "Adjusted",
  STOCK_DAMAGED: "Damaged",
  STOCK_LOST: "Lost",
  STOCK_ARCHIVED: "Archived",
};

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);
  const params = await searchParams;
  const page = typeof params.page === "string" ? Math.max(1, Number.parseInt(params.page, 10) || 1) : 1;

  const { rows, total } = await listStockMovements({ page, pageSize: PAGE_SIZE });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Stock Movements</h1>
        <p className="text-sm text-muted-foreground">
          Every recorded change across inventory — the ledger that will connect to POS and Sales.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Status Change</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="text-muted-foreground">{formatDateTime(movement.createdAt)}</TableCell>
                  <TableCell>{MOVEMENT_LABELS[movement.movementType] ?? movement.movementType}</TableCell>
                  <TableCell>
                    <Link href={`/inventory/${movement.inventoryItem.id}`} className="hover:text-gold">
                      {movement.inventoryItem.barcode
                        ? formatBarcodeCode(movement.inventoryItem.barcode.sequence)
                        : "—"}{" "}
                      · {movement.inventoryItem.product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {movement.previousStatus && movement.newStatus && movement.previousStatus !== movement.newStatus
                      ? `${movement.previousStatus} → ${movement.newStatus}`
                      : "—"}
                  </TableCell>
                  <TableCell>{movement.user?.name ?? "System"}</TableCell>
                  <TableCell className="text-muted-foreground">{movement.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/inventory/movements"
            searchParams={{}}
          />
        </CardContent>
      </Card>
    </div>
  );
}
