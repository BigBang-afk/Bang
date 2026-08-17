import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listAllCashReceivables } from "@/services/party-cash-ledger.service";
import { Card, CardContent } from "@/components/ui/card";
import { PartyCashSummaryTable } from "@/components/ledger/party-cash-summary-table";

export const metadata = { title: "Cash Receivable | Zarghoon Jewellers" };

export default async function CashReceivablePage() {
  await requirePermission(PERMISSIONS.CASH_VIEW);
  const rows = await listAllCashReceivables();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Cash Receivable</h1>
        <p className="text-sm text-muted-foreground">Every karigar and supplier that currently owes the business cash.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <PartyCashSummaryTable
            rows={rows}
            profileBasePath={(row) => (row.partyType === "KARIGAR" ? `/karigars/${row.partyId}` : `/suppliers/${row.partyId}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
