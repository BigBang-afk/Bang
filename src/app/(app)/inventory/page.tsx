import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { inventoryFilterSchema } from "@/lib/validation/inventory";
import { listInventoryItems, getInventorySummary } from "@/services/inventory-item.service";
import { listCategories } from "@/services/product-category.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InventorySummaryCards } from "@/components/inventory/inventory-summary-cards";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { Pagination } from "@/components/inventory/pagination";

export const metadata = { title: "Inventory | Zarghoon Jewellers" };

const PAGE_SIZE = 20;

export default async function AllStockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);

  const rawParams = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    flat[key] = typeof value === "string" ? value : undefined;
  }

  const parsed = inventoryFilterSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : {};
  const page = filters.page ?? 1;

  const [summary, categories, { rows, total }] = await Promise.all([
    getInventorySummary(),
    listCategories(),
    listInventoryItems({
      search: filters.search,
      categoryId: filters.categoryId,
      purity: filters.purity,
      status: filters.status,
      supplier: filters.supplier,
      karigar: filters.karigar,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minWeight: filters.minWeight,
      maxWeight: filters.maxWeight,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
      sort: filters.sort,
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">All Stock</h1>
          <p className="text-sm text-muted-foreground">
            Every jewelry item currently tracked in inventory.
          </p>
        </div>
        <Button asChild>
          <Link href="/inventory/add">
            <Plus className="size-4" />
            Add Stock
          </Link>
        </Button>
      </div>

      <InventorySummaryCards summary={summary} />

      <InventoryFilters categories={categories} values={flat} basePath="/inventory" />

      <Card>
        <CardContent className="p-0">
          <InventoryTable rows={rows} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/inventory" searchParams={flat} />
        </CardContent>
      </Card>
    </div>
  );
}
