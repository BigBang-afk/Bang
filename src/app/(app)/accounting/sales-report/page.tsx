import { getSalesReport } from "@/services/financial-reports.service";
import { listCategories } from "@/services/product-category.service";
import { prisma } from "@/lib/db/prisma";
import { parseReportDateParams } from "@/lib/report-date-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportDateFilter } from "@/components/accounting/report-date-filter";
import { ExportCsvButton } from "@/components/accounting/export-csv-button";
import { exportSalesReportAction } from "@/lib/actions/financial-reports.actions";
import { formatCurrency, formatWeight } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";
import type { GoldPurity, PaymentMethod } from "@/generated/prisma/client";

export const metadata = { title: "Sales Report | Zarghoon Jewellers" };

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" | "gold" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold" : "text-foreground";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { preset, custom } = parseReportDateParams(params);

  const [categories, cashiers] = await Promise.all([
    listCategories(),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const report = await getSalesReport(preset, custom, {
    categoryId: params.categoryId || undefined,
    cashierId: params.cashierId || undefined,
    paymentMethod: (params.paymentMethod as PaymentMethod) || undefined,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Sales Report</h1>
          <p className="text-sm text-muted-foreground">
            {report.from} to {report.to}
          </p>
        </div>
        <ExportCsvButton
          action={exportSalesReportAction}
          actionInput={{ preset, from: custom?.from, to: custom?.to, categoryId: params.categoryId, cashierId: params.cashierId, paymentMethod: params.paymentMethod }}
          filenamePrefix="sales-report"
        />
      </div>

      <ReportDateFilter values={params} basePath="/accounting/sales-report">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select name="categoryId" defaultValue={params.categoryId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cashier</Label>
          <Select name="cashierId" defaultValue={params.cashierId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              {cashiers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Payment Method</Label>
          <Select name="paymentMethod" defaultValue={params.paymentMethod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              {(["CASH", "CARD", "BANK_TRANSFER", "CREDIT", "OTHER"] as const).map((m) => (
                <SelectItem key={m} value={m}>
                  {m.replace("_", " ")}
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
          <Stat label="Gross Sales" value={formatCurrency(report.grossSales)} />
          <Stat label="Discounts" value={formatCurrency(report.discounts)} tone="danger" />
          <Stat label="Net Sales" value={formatCurrency(report.netSales)} tone="gold" />
          <Stat label="Average Invoice" value={formatCurrency(report.averageInvoiceValue)} />
          <Stat label="Invoices" value={String(report.invoiceCount)} />
          <Stat label="Items Sold" value={String(report.itemsSold)} />
          <Stat label="Refunds" value={formatCurrency(report.refunds)} tone="danger" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Cash" value={formatCurrency(report.cashSales)} />
          <Stat label="Card" value={formatCurrency(report.cardSales)} />
          <Stat label="Bank" value={formatCurrency(report.bankSales)} />
          <Stat label="Credit" value={formatCurrency(report.creditSales)} />
        </CardContent>
      </Card>

      {report.goldSoldByPurity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gold Sold — by purity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {report.goldSoldByPurity.map((g: { purity: GoldPurity; weight: string }) => (
              <Stat key={g.purity} label={PURITY_LABELS[g.purity]} value={formatWeight(g.weight)} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
