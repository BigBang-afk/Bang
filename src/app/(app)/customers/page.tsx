import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { customerListFilterSchema } from "@/lib/validation/customers";
import { listCustomers } from "@/services/customer.service";
import { getCustomerDashboardSummary } from "@/services/customer-analytics.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerSummaryCards } from "@/components/customers/customer-summary-cards";
import { CustomerFilters } from "@/components/customers/customer-filters";
import { CustomerTable } from "@/components/customers/customer-table";
import { ExportCustomersButton } from "@/components/customers/export-customers-button";
import { Pagination } from "@/components/inventory/pagination";

export const metadata = { title: "Customers | Zarghoon Jewellers" };

const PAGE_SIZE = 20;

export default async function AllCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const canExport = await userHasPermission(user, PERMISSIONS.CUSTOMERS_EXPORT);

  const rawParams = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    flat[key] = typeof value === "string" ? value : undefined;
  }

  const parsed = customerListFilterSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : {};
  const page = filters.page ?? 1;

  const [summary, { rows, total }] = await Promise.all([
    getCustomerDashboardSummary(),
    listCustomers({
      search: filters.search,
      customerType: filters.customerType,
      status: filters.status,
      city: filters.city,
      minSpending: filters.minSpending,
      maxSpending: filters.maxSpending,
      minOutstanding: filters.minOutstanding,
      purchasedAfter: filters.purchasedAfter ? new Date(filters.purchasedAfter) : undefined,
      purchasedBefore: filters.purchasedBefore ? new Date(filters.purchasedBefore) : undefined,
      sort: filters.sort,
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">All Customers</h1>
          <p className="text-sm text-muted-foreground">Every customer on record, searchable and filterable.</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && <ExportCustomersButton />}
          <Button asChild>
            <Link href="/customers/add">
              <Plus className="size-4" />
              Add Customer
            </Link>
          </Button>
        </div>
      </div>

      <CustomerSummaryCards summary={summary} />

      <CustomerFilters values={flat} basePath="/customers" />

      <Card>
        <CardContent className="p-0">
          <CustomerTable rows={rows} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/customers" searchParams={flat} />
        </CardContent>
      </Card>
    </div>
  );
}
