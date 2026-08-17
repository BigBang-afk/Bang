import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listGoldWithKarigars } from "@/services/gold-ledger.service";
import { Card, CardContent } from "@/components/ui/card";
import { PartyGoldSummaryTable } from "@/components/ledger/party-gold-summary-table";

export const metadata = { title: "Gold With Karigar | Zarghoon Jewellers" };

export default async function GoldWithKarigarPage() {
  await requirePermission(PERMISSIONS.KARIGARS_GOLD);
  const rows = await listGoldWithKarigars();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Gold With Karigar</h1>
        <p className="text-sm text-muted-foreground">
          Every karigar currently holding — or owed — a non-zero gold balance, by purity.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <PartyGoldSummaryTable rows={rows} profileBasePath="/karigars" />
        </CardContent>
      </Card>
    </div>
  );
}
