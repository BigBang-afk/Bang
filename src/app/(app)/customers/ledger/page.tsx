import Link from "next/link";
import { Search } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listAllLedgerEntries } from "@/services/customer-ledger.service";
import { LEDGER_TRANSACTION_TYPES, LEDGER_TRANSACTION_TYPE_LABELS } from "@/types/customers";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CustomerLedgerTable } from "@/components/customers/customer-ledger-table";
import { Pagination } from "@/components/inventory/pagination";
import type { LedgerTransactionType } from "@/generated/prisma/client";

export const metadata = { title: "Customer Ledger | Zarghoon Jewellers" };

const PAGE_SIZE = 25;

export default async function CustomerLedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.CUSTOMERS_LEDGER);

  const rawParams = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    flat[key] = typeof value === "string" ? value : undefined;
  }
  const page = Math.max(1, Number(flat.page) || 1);
  const transactionType =
    flat.transactionType && LEDGER_TRANSACTION_TYPES.includes(flat.transactionType as LedgerTransactionType)
      ? (flat.transactionType as LedgerTransactionType)
      : undefined;

  const { rows, total } = await listAllLedgerEntries({
    search: flat.search,
    transactionType,
    dateFrom: flat.dateFrom ? new Date(flat.dateFrom) : undefined,
    dateTo: flat.dateTo ? new Date(flat.dateTo) : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Customer Ledger</h1>
        <p className="text-sm text-muted-foreground">
          Every financial ledger entry, across every customer — the source of truth for outstanding balances.
        </p>
      </div>

      <Card>
        <CardContent className="py-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 basis-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="search" defaultValue={flat.search} placeholder="Search customer name or phone..." className="pl-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select name="transactionType" defaultValue={flat.transactionType}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {LEDGER_TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {LEDGER_TRANSACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input id="dateFrom" name="dateFrom" type="date" defaultValue={flat.dateFrom} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input id="dateTo" name="dateTo" type="date" defaultValue={flat.dateTo} />
            </div>
            <Button type="submit">Search</Button>
            <Button variant="ghost" asChild>
              <Link href="/customers/ledger">Reset</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <CustomerLedgerTable rows={rows} showCustomer />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/customers/ledger" searchParams={flat} />
        </CardContent>
      </Card>
    </div>
  );
}
