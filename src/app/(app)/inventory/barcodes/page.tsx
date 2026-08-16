import { Search } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listInventoryItems } from "@/services/inventory-item.service";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarcodeSelectionGrid } from "@/components/inventory/barcode-selection-grid";
import { formatBarcodeCode } from "@/lib/barcode-code";

export const metadata = { title: "Barcodes | Zarghoon Jewellers" };

export default async function BarcodesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;

  const { rows } = await listInventoryItems({ search, page: 1, pageSize: 100 });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Barcodes</h1>
        <p className="text-sm text-muted-foreground">
          Select stock items to print their ZJ barcode labels, one at a time or in a batch.
        </p>
      </div>

      <Card>
        <CardContent className="py-4">
          <form method="GET" className="flex gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="search" defaultValue={search} placeholder="Search barcode or product..." className="pl-9" />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      <BarcodeSelectionGrid
        rows={rows.map((row) => ({
          id: row.id,
          barcodeCode: row.barcode ? formatBarcodeCode(row.barcode.sequence) : null,
          productName: row.product.name,
          productImageUrl: row.product.imageUrl,
          purity: row.purity,
          sellingPrice: row.sellingPrice.toString(),
        }))}
      />
    </div>
  );
}
