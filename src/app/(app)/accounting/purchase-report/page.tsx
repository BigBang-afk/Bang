import { getPurchaseReport } from "@/services/financial-reports.service";
import { prisma } from "@/lib/db/prisma";
import { parseReportDateParams } from "@/lib/report-date-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportDateFilter } from "@/components/accounting/report-date-filter";
import { ExportCsvButton } from "@/components/accounting/export-csv-button";
import { exportPurchaseReportAction } from "@/lib/actions/financial-reports.actions";
import { formatCurrency, formatWeight } from "@/lib/format";
import { PURITY_LABELS, GOLD_PURITIES } from "@/types/gold";
import { PURCHASE_PAYMENT_STATUSES } from "@/types/purchases";
import type { GoldPurity } from "@/generated/prisma/client";

export const metadata = { title: "Purchase Report | Zarghoon Jewellers" };

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" | "gold" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold" : "text-foreground";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function PurchaseReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { preset, custom } = parseReportDateParams(params);
  const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  const report = await getPurchaseReport(preset, custom, {
    supplierId: params.supplierId || undefined,
    purity: (params.purity as GoldPurity) || undefined,
    paymentStatus: (params.paymentStatus as (typeof PURCHASE_PAYMENT_STATUSES)[number]) || undefined,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Purchase Report</h1>
          <p className="text-sm text-muted-foreground">
            {report.from} to {report.to}
          </p>
        </div>
        <ExportCsvButton
          action={exportPurchaseReportAction}
          actionInput={{ preset, from: custom?.from, to: custom?.to, supplierId: params.supplierId, purity: params.purity, paymentStatus: params.paymentStatus }}
          filenamePrefix="purchase-report"
        />
      </div>

      <ReportDateFilter values={params} basePath="/accounting/purchase-report">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Supplier</Label>
          <Select name="supplierId" defaultValue={params.supplierId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Purity</Label>
          <Select name="purity" defaultValue={params.purity}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              {GOLD_PURITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PURITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Payment Status</Label>
          <Select name="paymentStatus" defaultValue={params.paymentStatus}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              {PURCHASE_PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReportDateFilter>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Purchases" value={String(report.purchaseCount)} />
          <Stat label="Total Cost" value={formatCurrency(report.totalPurchaseCost)} tone="gold" />
          <Stat label="Amount Paid" value={formatCurrency(report.amountPaid)} tone="success" />
          <Stat label="Outstanding Payable" value={formatCurrency(report.outstandingPayable)} tone="danger" />
          <Stat label="Items Purchased" value={String(report.itemsPurchased)} />
        </CardContent>
      </Card>

      {report.goldPurchasedByPurity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gold Purchased — by purity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {report.goldPurchasedByPurity.map((g) => (
              <Stat key={g.purity} label={PURITY_LABELS[g.purity]} value={formatWeight(g.weight)} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
