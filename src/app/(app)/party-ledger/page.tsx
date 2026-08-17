import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listGoldWithKarigars, listGoldWithSuppliers } from "@/services/gold-ledger.service";
import { listKarigarCashPositions, listSupplierCashPositions } from "@/services/party-cash-ledger.service";
import { getCashSummary } from "@/services/cash-transaction.service";
import { getPurchaseSummary } from "@/services/purchase.service";
import { getLatestGoldReconciliationByPurity } from "@/services/reconciliation.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartyGoldSummaryTable } from "@/components/ledger/party-gold-summary-table";
import { PartyCashSummaryTable } from "@/components/ledger/party-cash-summary-table";
import { formatCurrency, formatWeight } from "@/lib/format";
import { PURITY_LABELS, GOLD_PURITIES } from "@/types/gold";

export const metadata = { title: "Party Ledger | Zarghoon Jewellers" };

export default async function PartyLedgerPage() {
  await requirePermission(PERMISSIONS.GOLD_LEDGER_VIEW);

  const [karigarGold, supplierGold, karigarCash, supplierCash, cashSummary, purchaseSummary, goldReconByPurity] =
    await Promise.all([
      listGoldWithKarigars(),
      listGoldWithSuppliers(),
      listKarigarCashPositions(),
      listSupplierCashPositions(),
      getCashSummary(),
      getPurchaseSummary(),
      getLatestGoldReconciliationByPurity(),
    ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Party Ledger</h1>
        <p className="text-sm text-muted-foreground">
          The combined karigar and supplier position — gold (grams) and cash (Rs.) are always shown separately, never
          added into one number. This page also serves as the operational reporting foundation for Phase 5.
        </p>
      </div>

      {/* GOLD POSITION */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Karigar Gold Position</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PartyGoldSummaryTable rows={karigarGold} profileBasePath="/karigars" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Supplier Gold Position</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PartyGoldSummaryTable rows={supplierGold} profileBasePath="/suppliers" />
          </CardContent>
        </Card>
      </div>

      {/* CASH POSITION */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Karigar Cash Position</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PartyCashSummaryTable rows={karigarCash} profileBasePath={(row) => `/karigars/${row.partyId}`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Supplier Payables</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PartyCashSummaryTable rows={supplierCash} profileBasePath={(row) => `/suppliers/${row.partyId}`} />
          </CardContent>
        </Card>
      </div>

      {/* REPORTING FOUNDATION */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ReportStat label="Opening" value={formatCurrency(cashSummary.openingBalance)} />
          <ReportStat label="Total In" value={formatCurrency(cashSummary.totalIn)} tone="success" />
          <ReportStat label="Total Out" value={formatCurrency(cashSummary.totalOut)} tone="danger" />
          <ReportStat label="Closing" value={formatCurrency(cashSummary.closingBalance)} tone="gold" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ReportStat label="Purchases" value={String(purchaseSummary.purchaseCount)} />
            <ReportStat label="Total Value" value={formatCurrency(purchaseSummary.totalPurchases)} tone="gold" />
            <ReportStat label="Total Paid" value={formatCurrency(purchaseSummary.totalPaid)} tone="success" />
            <ReportStat label="Total Payable" value={formatCurrency(purchaseSummary.totalPayable)} tone="danger" />
          </div>
          {purchaseSummary.byPurity.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {purchaseSummary.byPurity.map((p) => (
                <Badge key={p.purity} variant="neutral">
                  {PURITY_LABELS[p.purity]}: {formatWeight(p.totalWeight)}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gold Reconciliation</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {GOLD_PURITIES.map((purity) => {
            const latest = goldReconByPurity[purity];
            return (
              <div key={purity} className="rounded-md border border-border bg-surface-elevated px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{PURITY_LABELS[purity]}</p>
                {latest ? (
                  <Badge variant={latest.status === "MATCHED" ? "success" : "danger"} className="mt-1">
                    {latest.status === "MATCHED" ? "Matched" : "Required"}
                  </Badge>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Not yet run</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" | "gold" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold" : "text-foreground";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
