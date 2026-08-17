import Link from "next/link";
import { getPayableReport, getGoldObligationReport } from "@/services/financial-reports.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PartyGoldSummaryTable } from "@/components/ledger/party-gold-summary-table";
import { ExportCsvButton } from "@/components/accounting/export-csv-button";
import { exportPayableReportAction } from "@/lib/actions/financial-reports.actions";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Payables | Zarghoon Jewellers" };

export default async function PayablesPage() {
  const [payables, goldObligations] = await Promise.all([getPayableReport(), getGoldObligationReport()]);
  const total = payables.reduce((sum, r) => sum + Number(r.payable), 0);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Payables</h1>
          <p className="text-sm text-muted-foreground">
            {payables.length} part(y/ies) owed {formatCurrency(total)}. Gold obligations are kept structurally
            separate — never converted to a rupee figure.
          </p>
        </div>
        <ExportCsvButton action={exportPayableReportAction} filenamePrefix="payables" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Payable — Supplier &amp; Karigar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payables.length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-muted-foreground">No outstanding cash payables.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Party</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Payable</TableHead>
                  <TableHead>Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((row) => (
                  <TableRow key={`${row.partyType}-${row.partyId}`}>
                    <TableCell>
                      <Link
                        href={row.partyType === "KARIGAR" ? `/karigars/${row.partyId}` : `/suppliers/${row.partyId}`}
                        className="font-medium text-foreground hover:text-gold"
                      >
                        {row.name}
                      </Link>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{row.partyCode}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{row.partyType === "KARIGAR" ? "Karigar" : "Supplier"}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-danger">{formatCurrency(row.payable)}</TableCell>
                    <TableCell className="text-muted-foreground">{row.ageDays} days</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gold Obligations — Karigars</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PartyGoldSummaryTable rows={goldObligations.karigars} profileBasePath="/karigars" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gold Obligations — Suppliers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PartyGoldSummaryTable rows={goldObligations.suppliers} profileBasePath="/suppliers" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
