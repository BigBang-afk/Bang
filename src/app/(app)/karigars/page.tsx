import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { karigarListFilterSchema } from "@/lib/validation/karigars";
import { listKarigars, getKarigarDashboardSummary } from "@/services/karigar.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KarigarSummaryCards } from "@/components/karigars/karigar-summary-cards";
import { KarigarFilters } from "@/components/karigars/karigar-filters";
import { KarigarTable } from "@/components/karigars/karigar-table";
import { Pagination } from "@/components/inventory/pagination";

export const metadata = { title: "Karigars | Zarghoon Jewellers" };

const PAGE_SIZE = 20;

export default async function AllKarigarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.KARIGARS_VIEW);

  const rawParams = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    flat[key] = typeof value === "string" ? value : undefined;
  }

  const parsed = karigarListFilterSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : {};
  const page = filters.page ?? 1;

  const [summary, { rows, total }] = await Promise.all([
    getKarigarDashboardSummary(),
    listKarigars({ ...filters, page, pageSize: PAGE_SIZE }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">All Karigars</h1>
          <p className="text-sm text-muted-foreground">Every karigar on record, searchable and filterable.</p>
        </div>
        <Button asChild>
          <Link href="/karigars/add">
            <Plus className="size-4" />
            Add Karigar
          </Link>
        </Button>
      </div>

      <KarigarSummaryCards summary={summary} />

      <KarigarFilters values={flat} basePath="/karigars" />

      <Card>
        <CardContent className="p-0">
          <KarigarTable rows={rows} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/karigars" searchParams={flat} />
        </CardContent>
      </Card>
    </div>
  );
}
