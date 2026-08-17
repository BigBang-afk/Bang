import Link from "next/link";
import { Eye, Download, Printer } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listSales } from "@/services/sale.service";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/inventory/pagination";

export const metadata = { title: "Invoices | Zarghoon Jewellers" };

const PAGE_SIZE = 20;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.SALES_VIEW);

  const rawParams = await searchParams;
  const page = Math.max(1, Number(rawParams.page) || 1);

  const { rows, total } = await listSales({ sort: "NEWEST", page, pageSize: PAGE_SIZE });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Every generated invoice document, with print and download history.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <p className="text-sm font-medium text-foreground">No invoices yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Grand Total</TableHead>
                  <TableHead>Printed</TableHead>
                  <TableHead>Downloaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.invoice ? formatInvoiceNumber(row.invoice.sequence) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.invoice ? formatDateTime(row.invoice.generatedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.customer?.name ?? "Walk-in"}
                    </TableCell>
                    <TableCell className="font-medium text-gold">
                      {formatCurrency(row.grandTotal.toString())}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.invoice?.printCount ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">{row.invoice?.downloadCount ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild title="View sale">
                          <Link href={`/pos/sales/${row.id}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Print invoice">
                          <Link href={`/pos/sales/${row.id}/invoice`}>
                            <Printer className="size-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Download PDF">
                          <Link href={`/api/invoices/${row.id}/pdf`}>
                            <Download className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/pos/invoices" searchParams={{}} />
        </CardContent>
      </Card>
    </div>
  );
}
