import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getInventoryItemById } from "@/services/inventory-item.service";
import { recordBarcodePrintAction } from "@/lib/actions/inventory.actions";
import { BarcodeLabel } from "@/components/inventory/barcode-label";
import { PrintButton } from "@/components/inventory/print-button";
import { Button } from "@/components/ui/button";
import { formatBarcodeCode } from "@/lib/barcode-code";

export const metadata = { title: "Print Barcode | Zarghoon Jewellers" };

export default async function PrintBarcodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);
  const { id } = await params;

  const item = await getInventoryItemById(id);
  if (!item || !item.barcode) notFound();

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-4 sm:p-6">
      <div className="flex w-full max-w-md items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/inventory/${item.id}`}>
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <PrintButton onBeforePrint={recordBarcodePrintAction.bind(null, item.id)} label="Print Barcode" />
      </div>

      <BarcodeLabel
        data={{
          barcodeCode: formatBarcodeCode(item.barcode.sequence),
          productName: item.product.name,
          purity: item.purity,
          grossWeight: item.grossWeight.toString(),
          sellingPrice: item.sellingPrice.toString(),
        }}
      />
    </div>
  );
}
