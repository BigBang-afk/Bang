import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPurchaseById } from "@/services/purchase.service";
import { formatPurchaseNumber } from "@/lib/purchase-number";
import { formatBarcodeCode } from "@/lib/barcode-code";
import { formatCurrency, formatWeight, formatDate, formatDateTime } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";
import { derivePurchasePaymentStatus } from "@/types/purchases";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Purchase Detail | Zarghoon Jewellers" };

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.PURCHASES_VIEW);
  const { id } = await params;

  const purchase = await getPurchaseById(id);
  if (!purchase) notFound();

  const status = derivePurchasePaymentStatus(purchase.paidAmount.toString(), purchase.grandTotal.toString());

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">{formatPurchaseNumber(purchase.sequence)}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(purchase.purchaseDate)} ·{" "}
            <Link href={`/suppliers/${purchase.supplier.id}`} className="hover:text-gold">
              {purchase.supplier.name}
            </Link>
            {purchase.referenceNumber ? ` · Ref: ${purchase.referenceNumber}` : ""}
          </p>
        </div>
        <Badge variant={status === "PAID" ? "success" : status === "PARTIALLY_PAID" ? "warning" : "danger"}>
          {status.replace("_", " ")}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Purity</TableHead>
                <TableHead>Net Weight</TableHead>
                <TableHead>Gross Weight</TableHead>
                <TableHead>Gold Rate</TableHead>
                <TableHead>Gold Value</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Inventory</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">{item.productName}</TableCell>
                  <TableCell>{PURITY_LABELS[item.purity]}</TableCell>
                  <TableCell className="font-mono">{formatWeight(item.netWeight)}</TableCell>
                  <TableCell className="font-mono">{formatWeight(item.grossWeight)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatCurrency(item.goldRatePerGram)}</TableCell>
                  <TableCell className="text-gold">{formatCurrency(item.goldValue)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCurrency(
                      item.makingCharge.add(item.stoneCharge).add(item.diamondCharge).add(item.otherCharge),
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{formatCurrency(item.totalCost)}</TableCell>
                  <TableCell>
                    {item.inventoryItem ? (
                      <Link
                        href={`/inventory/${item.inventoryItem.id}`}
                        className="text-gold hover:underline"
                      >
                        {item.inventoryItem.barcode ? formatBarcodeCode(item.inventoryItem.barcode.sequence) : "View"}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Not added</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="flex justify-between text-muted-foreground">
              <span>Subtotal (Gold Value)</span>
              <span className="font-mono text-foreground">{formatCurrency(purchase.subtotal)}</span>
            </p>
            <p className="flex justify-between text-muted-foreground">
              <span>Total Charges</span>
              <span className="font-mono text-foreground">{formatCurrency(purchase.totalCharges)}</span>
            </p>
            <p className="flex justify-between font-medium text-foreground">
              <span>Grand Total</span>
              <span className="font-mono text-gold">{formatCurrency(purchase.grandTotal)}</span>
            </p>
            <p className="flex justify-between text-success">
              <span>Paid</span>
              <span className="font-mono">{formatCurrency(purchase.paidAmount)}</span>
            </p>
            <p className="flex justify-between text-danger">
              <span>Balance</span>
              <span className="font-mono">{formatCurrency(purchase.balanceAmount)}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {purchase.payments.length === 0 ? (
              <p className="text-muted-foreground">No payment recorded at purchase time.</p>
            ) : (
              purchase.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="text-foreground">{payment.method.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(payment.createdAt)} · {payment.createdBy.name}</p>
                  </div>
                  <span className="font-mono text-success">{formatCurrency(payment.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {purchase.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{purchase.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
