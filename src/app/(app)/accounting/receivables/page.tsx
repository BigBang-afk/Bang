import Link from "next/link";
import { getReceivableAgingReport } from "@/services/financial-reports.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExportCsvButton } from "@/components/accounting/export-csv-button";
import { exportReceivableAgingAction } from "@/lib/actions/financial-reports.actions";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata = { title: "Receivables | Zarghoon Jewellers" };

const BUCKET_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  Current: "success",
};

export default async function ReceivablesPage() {
  const { rows, buckets } = await getReceivableAgingReport();
  const total = rows.reduce((sum, r) => sum + Number(r.outstandingBalance), 0);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Receivables</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} customer(s) owing {formatCurrency(total)} — aging buckets: Current / 1-{buckets[1]} /{" "}
            {buckets[1] + 1}-{buckets[2]} / {buckets[2]}+ days.
          </p>
        </div>
        <ExportCsvButton action={exportReceivableAgingAction} filenamePrefix="receivables" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer aging (per-customer running balance)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-muted-foreground">No outstanding customer balances.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Last Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.customerId}>
                    <TableCell>
                      <Link href={`/customers/${row.customerId}`} className="font-medium text-foreground hover:text-gold">
                        {row.name}
                      </Link>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{row.customerCode}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-gold">{formatCurrency(row.outstandingBalance)}</TableCell>
                    <TableCell className="text-muted-foreground">{row.ageDays} days</TableCell>
                    <TableCell>
                      <Badge variant={BUCKET_TONE[row.bucket] ?? "warning"}>{row.bucket}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.lastPaymentAt ? formatDate(row.lastPaymentAt) : "Never"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Aging is customer-level, not per-invoice: customer payments are applied against a running balance rather than
        allocated to a specific sale (see CUSTOMER-LEDGER.md), so age is a proxy — days since the customer&apos;s most
        recent sale.
      </p>
    </div>
  );
}
