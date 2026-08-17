import Link from "next/link";
import { requirePermission, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listReturns } from "@/services/returns.service";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApproveReturnButton } from "@/components/pos/approve-return-button";

export const metadata = { title: "Returns | Zarghoon Jewellers" };

export default async function ReturnsPage() {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const canApprove = await userHasPermission(user, PERMISSIONS.SALES_RETURN);

  const returns = await listReturns();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Returns</h1>
        <p className="text-sm text-muted-foreground">
          Requesting a return never touches inventory — only approving one does.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {returns.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <p className="text-sm font-medium text-foreground">No returns yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell className="text-muted-foreground">{formatDateTime(ret.requestedAt)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/pos/sales/${ret.saleItem.sale.id}`} className="hover:text-gold">
                        {ret.saleItem.sale.invoice
                          ? formatInvoiceNumber(ret.saleItem.sale.invoice.sequence)
                          : "—"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{ret.saleItem.productName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{ret.saleItem.barcodeCode}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ret.saleItem.sale.customer?.name ?? "Walk-in"}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground" title={ret.reason ?? ""}>
                      {ret.reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ret.requestedBy.name}</TableCell>
                    <TableCell>
                      <Badge variant={ret.status === "RETURNED" ? "neutral" : "warning"}>
                        {ret.status === "RETURNED" ? "Returned" : "Requested"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {canApprove && ret.status === "RETURN_REQUESTED" && (
                          <ApproveReturnButton returnId={ret.id} productName={ret.saleItem.productName} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
