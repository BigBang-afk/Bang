import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { supplierListFilterSchema } from "@/lib/validation/suppliers";
import { listSuppliers } from "@/services/supplier.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SupplierFilters } from "@/components/suppliers/supplier-filters";
import { SupplierTable } from "@/components/suppliers/supplier-table";
import { Pagination } from "@/components/inventory/pagination";

export const metadata = { title: "Suppliers | Zarghoon Jewellers" };

const PAGE_SIZE = 20;

export default async function AllSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.SUPPLIERS_VIEW);

  const rawParams = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    flat[key] = typeof value === "string" ? value : undefined;
  }

  const parsed = supplierListFilterSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : {};
  const page = filters.page ?? 1;

  const { rows, total } = await listSuppliers({ ...filters, page, pageSize: PAGE_SIZE });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">All Suppliers</h1>
          <p className="text-sm text-muted-foreground">Every supplier on record, searchable and filterable.</p>
        </div>
        <Button asChild>
          <Link href="/suppliers/add">
            <Plus className="size-4" />
            Add Supplier
          </Link>
        </Button>
      </div>

      <SupplierFilters values={flat} basePath="/suppliers" />

      <Card>
        <CardContent className="p-0">
          <SupplierTable rows={rows} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/suppliers" searchParams={flat} />
        </CardContent>
      </Card>
    </div>
  );
}
