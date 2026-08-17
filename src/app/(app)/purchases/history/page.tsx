import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { purchaseListFilterSchema } from "@/lib/validation/purchases";
import { listPurchases } from "@/services/purchase.service";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseFilters } from "@/components/purchases/purchase-filters";
import { PurchaseHistoryTable } from "@/components/purchases/purchase-history-table";
import { Pagination } from "@/components/inventory/pagination";

export const metadata = { title: "Purchase History | Zarghoon Jewellers" };

const PAGE_SIZE = 20;

export default async function PurchaseHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.PURCHASES_VIEW);

  const rawParams = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    flat[key] = typeof value === "string" ? value : undefined;
  }

  const parsed = purchaseListFilterSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : {};
  const page = filters.page ?? 1;

  const { rows, total } = await listPurchases({
    search: filters.search,
    supplierId: filters.supplierId,
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    paymentStatus: filters.paymentStatus,
    sort: filters.sort,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Purchase History</h1>
        <p className="text-sm text-muted-foreground">Every supplier purchase on record.</p>
      </div>

      <PurchaseFilters values={flat} basePath="/purchases/history" />

      <Card>
        <CardContent className="p-0">
          <PurchaseHistoryTable rows={rows} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/purchases/history" searchParams={flat} />
        </CardContent>
      </Card>
    </div>
  );
}
