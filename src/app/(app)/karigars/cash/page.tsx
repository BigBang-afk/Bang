import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listKarigarCashPositions } from "@/services/party-cash-ledger.service";
import { Card, CardContent } from "@/components/ui/card";
import { PartyCashSummaryTable } from "@/components/ledger/party-cash-summary-table";

export const metadata = { title: "Cash With Karigar | Zarghoon Jewellers" };

export default async function CashWithKarigarPage() {
  await requirePermission(PERMISSIONS.KARIGARS_CASH);
  const rows = await listKarigarCashPositions();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Cash With Karigar</h1>
        <p className="text-sm text-muted-foreground">Every karigar with a non-zero cash payable or receivable.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <PartyCashSummaryTable rows={rows} profileBasePath={(row) => `/karigars/${row.partyId}`} />
        </CardContent>
      </Card>
    </div>
  );
}
