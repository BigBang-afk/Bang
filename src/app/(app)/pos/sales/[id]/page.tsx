import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, Download } from "lucide-react";
import { requirePermission, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSaleById } from "@/services/sale.service";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import { formatCurrency, formatDateTime, formatWeight } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";
import { PAYMENT_METHOD_LABELS } from "@/types/sales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SaleStatusBadge, PaymentStatusBadge } from "@/components/pos/sale-status-badge";
import { RequestReturnButton } from "@/components/pos/request-return-button";

export const metadata = { title: "Sale Detail | Zarghoon Jewellers" };

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const { id } = await params;

  const sale = await getSaleById(id);
  if (!sale) notFound();

  const canReturn = await userHasPermission(user, PERMISSIONS.SALES_RETURN);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            {sale.invoice ? formatInvoiceNumber(sale.invoice.sequence) : "Sale"}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDateTime(sale.saleDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <SaleStatusBadge status={sale.status} />
          <PaymentStatusBadge balanceAmount={sale.balanceAmount.toString()} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/pos/sales/${sale.id}/invoice`}>
              <Printer className="size-4" />
              Print
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/api/invoices/${sale.id}/pdf`}>
              <Download className="size-4" />
              PDF
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {sale.items.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.productName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{item.barcodeCode}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {PURITY_LABELS[item.purity]} · Net {formatWeight(item.netWeight.toString())} · Gross{" "}
                      {formatWeight(item.grossWeight.toString())} · Rate{" "}
                      {formatCurrency(item.goldRatePerGram.toString())}/g
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Gold {formatCurrency(item.goldValue.toString())} · Making{" "}
                      {formatCurrency(item.makingCharge.toString())} · Stone{" "}
                      {formatCurrency(item.stoneCharge.toString())} · Diamond{" "}
                      {formatCurrency(item.diamondCharge.toString())} · Other{" "}
                      {formatCurrency(item.otherCharge.toString())}
                    </p>
                    {item.return && (
                      <p className="mt-1 text-xs text-warning">
                        Return {item.return.status === "RETURNED" ? "completed" : "requested"}
                        {item.return.reason ? ` — ${item.return.reason}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                    {Number(item.discountAmount) > 0 && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatCurrency(item.originalSellingPrice.toString())}
                      </p>
                    )}
                    <p className="font-semibold text-foreground">{formatCurrency(item.finalPrice.toString())}</p>
                    {canReturn && !item.return && sale.status !== "RETURNED" && (
                      <RequestReturnButton saleItemId={item.id} productName={item.productName} />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {sale.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{PAYMENT_METHOD_LABELS[payment.method]}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.reference ? `Ref: ${payment.reference} · ` : ""}
                      {formatDateTime(payment.createdAt)} · {payment.createdBy.name}
                    </p>
                  </div>
                  <p className="font-medium text-foreground">{formatCurrency(payment.amount.toString())}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              {sale.customer ? (
                <div className="text-sm">
                  <p className="font-medium text-foreground">{sale.customer.name}</p>
                  <p className="text-muted-foreground">{sale.customer.phone}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Walk-in customer</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatCurrency(sale.subtotal.toString())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-foreground">-{formatCurrency(sale.discount.toString())}</span>
              </div>
              {Number(sale.tax) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">{formatCurrency(sale.tax.toString())}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span className="text-foreground">Grand Total</span>
                <span className="text-gold">{formatCurrency(sale.grandTotal.toString())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span className="text-foreground">{formatCurrency(sale.paidAmount.toString())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance</span>
                <span className={Number(sale.balanceAmount) > 0 ? "text-warning" : "text-foreground"}>
                  {formatCurrency(sale.balanceAmount.toString())}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created by</span>
                <span className="text-foreground">{sale.createdBy.name}</span>
              </div>
              {sale.invoice && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Printed</span>
                    <span className="text-foreground">{sale.invoice.printCount} time(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Downloaded</span>
                    <span className="text-foreground">{sale.invoice.downloadCount} time(s)</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
