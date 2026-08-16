import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { saleListFilterSchema } from "@/lib/validation/sales";
import { listSales } from "@/services/sale.service";
import { Card, CardContent } from "@/components/ui/card";
import { SalesFilters } from "@/components/pos/sales-filters";
import { SalesTable } from "@/components/pos/sales-table";
import { Pagination } from "@/components/inventory/pagination";

export const metadata = { title: "Sales History | Zarghoon Jewellers" };

const PAGE_SIZE = 20;

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.SALES_VIEW);

  const rawParams = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    flat[key] = typeof value === "string" ? value : undefined;
  }

  const parsed = saleListFilterSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : {};
  const page = filters.page ?? 1;

  const { rows, total } = await listSales({
    search: filters.search,
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    paymentStatus: filters.paymentStatus,
    status: filters.status,
    sort: filters.sort,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Sales History</h1>
        <p className="text-sm text-muted-foreground">Every completed sale, searchable and filterable.</p>
      </div>

      <SalesFilters values={flat} basePath="/pos/sales" />

      <Card>
        <CardContent className="p-0">
          <SalesTable rows={rows} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/pos/sales" searchParams={flat} />
        </CardContent>
      </Card>
    </div>
  );
}
