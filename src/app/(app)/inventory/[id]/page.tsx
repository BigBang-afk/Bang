import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, Pencil, Printer, FileText } from "lucide-react";
import { requirePermission, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getInventoryItemById } from "@/services/inventory-item.service";
import { listStockMovementsForItem } from "@/services/stock-movement.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StockStatusBadge } from "@/components/inventory/stock-status-badge";
import { StatusChangeForm } from "@/components/inventory/status-change-form";
import { ArchiveItemButton } from "@/components/inventory/archive-item-button";
import { StockHistoryTimeline } from "@/components/inventory/stock-history-timeline";
import { formatCurrency, formatDate, formatWeight, formatRatePerGram } from "@/lib/format";
import { formatBarcodeCode } from "@/lib/barcode-code";
import { PURITY_LABELS } from "@/types/gold";

export const metadata = { title: "Stock Item | Zarghoon Jewellers" };

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.INVENTORY_VIEW);
  const { id } = await params;

  const [item, movements, canManage] = await Promise.all([
    getInventoryItemById(id),
    listStockMovementsForItem(id),
    userHasPermission(user, PERMISSIONS.INVENTORY_MANAGE),
  ]);

  if (!item) notFound();

  const barcodeCode = item.barcode ? formatBarcodeCode(item.barcode.sequence) : "—";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-semibold text-foreground">{item.product.name}</h1>
            <StockStatusBadge status={item.status} />
            {item.archivedAt && (
              <span className="text-xs text-muted-foreground">Archived {formatDate(item.archivedAt)}</span>
            )}
          </div>
          <p className="font-mono text-sm text-muted-foreground">{barcodeCode}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/inventory/${item.id}/print/barcode`}>
              <Printer className="size-4" />
              Print Barcode
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/inventory/${item.id}/print/product`}>
              <FileText className="size-4" />
              Print Product
            </Link>
          </Button>
          {canManage && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/inventory/${item.id}/edit`}>
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
              {!item.archivedAt && <ArchiveItemButton itemId={item.id} />}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-[7rem_1fr]">
              <div className="flex size-28 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-elevated">
                {item.product.imageUrl ? (
                  <Image
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    width={112}
                    height={112}
                    className="size-28 object-cover"
                  />
                ) : (
                  <ImageOff className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailField label="Category" value={item.product.category.name} />
                <DetailField label="Subcategory" value={item.product.subcategory} />
                <DetailField label="Design Number" value={item.product.designNumber} />
                <DetailField label="Supplier" value={item.product.supplier} />
                <DetailField label="Karigar" value={item.product.karigar} />
                <DetailField label="Created" value={formatDate(item.createdAt)} />
                {item.product.notes && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="text-foreground">{item.product.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gold &amp; Cost Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <DetailField label="Purity" value={PURITY_LABELS[item.purity]} />
              <DetailField label="Net Weight" value={formatWeight(item.netWeight.toString())} />
              <DetailField
                label="Wastage"
                value={
                  item.wastagePercent
                    ? `${item.wastagePercent.toString()}% (${formatWeight(item.wastageWeight.toString())})`
                    : formatWeight(item.wastageWeight.toString())
                }
              />
              <DetailField label="Gross Weight" value={formatWeight(item.grossWeight.toString())} />
              <DetailField label="Gold Rate" value={formatRatePerGram(item.goldRatePerGram.toString())} />
              <DetailField label="Gold Value" value={formatCurrency(item.goldValue.toString())} />
              <DetailField label="Making Charges" value={formatCurrency(item.makingCharge.toString())} />
              <DetailField label="Stone Charges" value={formatCurrency(item.stoneCharge.toString())} />
              <DetailField label="Diamond Charges" value={formatCurrency(item.diamondCharge.toString())} />
              <DetailField label="Other Charges" value={formatCurrency(item.otherCharge.toString())} />
              <div className="col-span-2 sm:col-span-3">
                <Separator className="my-1" />
              </div>
              <DetailField label="Total Cost" value={formatCurrency(item.totalCost.toString())} strong />
              <DetailField label="Selling Price" value={formatCurrency(item.sellingPrice.toString())} strong gold />
              <DetailField
                label="Expected Profit"
                value={formatCurrency(item.expectedProfit.toString())}
                strong
                danger={item.expectedProfit.toString().startsWith("-")}
              />
              <DetailField label="Profit Margin" value={`${item.profitMarginPercent.toString()}%`} />
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-muted-foreground">
                  {item.goldRateSource
                    ? `Costed at the official rate for ${formatDate(item.goldRateSource.businessDate)}.`
                    : "Costed at a manually entered gold rate (not matched to an official daily rate)."}
                </p>
              </div>
            </CardContent>
          </Card>

          <StockHistoryTimeline movements={movements} />
        </div>

        <div className="space-y-6">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusChangeForm itemId={item.id} currentStatus={item.status} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Barcode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-mono text-lg text-gold">{barcodeCode}</p>
              <p className="text-muted-foreground">
                Printed {item.barcode?.printCount ?? 0} time{(item.barcode?.printCount ?? 0) === 1 ? "" : "s"}
              </p>
              {item.barcode?.lastPrintedAt && (
                <p className="text-xs text-muted-foreground">
                  Last printed {formatDate(item.barcode.lastPrintedAt)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>Created by {item.createdBy.name}</p>
              <p>{formatDate(item.createdAt)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  strong,
  gold,
  danger,
}: {
  label: string;
  value?: string | null;
  strong?: boolean;
  gold?: boolean;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          gold
            ? "font-semibold text-gold"
            : danger
              ? "font-semibold text-danger"
              : strong
                ? "font-semibold text-foreground"
                : "text-foreground"
        }
      >
        {value || "—"}
      </p>
    </div>
  );
}
