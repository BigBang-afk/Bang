import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listGoldWithSuppliers } from "@/services/gold-ledger.service";
import { Card, CardContent } from "@/components/ui/card";
import { PartyGoldSummaryTable } from "@/components/ledger/party-gold-summary-table";

export const metadata = { title: "Gold With Suppliers | Zarghoon Jewellers" };

export default async function GoldWithSuppliersPage() {
  await requirePermission(PERMISSIONS.GOLD_LEDGER_VIEW);
  const rows = await listGoldWithSuppliers();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Gold With Suppliers</h1>
        <p className="text-sm text-muted-foreground">
          Every supplier the business currently holds — or owes — a non-zero gold balance with, by purity.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <PartyGoldSummaryTable rows={rows} profileBasePath="/suppliers" />
        </CardContent>
      </Card>
    </div>
  );
}
