import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { recordBarcodePrintsAction } from "@/lib/actions/inventory.actions";
import { BarcodeLabel } from "@/components/inventory/barcode-label";
import { PrintButton } from "@/components/inventory/print-button";
import { Button } from "@/components/ui/button";
import { formatBarcodeCode } from "@/lib/barcode-code";

export const metadata = { title: "Print Barcodes | Zarghoon Jewellers" };

export default async function PrintBarcodesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);
  const params = await searchParams;
  const idsParam = typeof params.ids === "string" ? params.ids : "";
  const ids = idsParam.split(",").filter(Boolean);

  const items = ids.length
    ? await prisma.inventoryItem.findMany({
        where: { id: { in: ids } },
        include: { product: true, barcode: true },
      })
    : [];

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-4 sm:p-6">
      <div className="flex w-full max-w-3xl items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inventory/barcodes">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <PrintButton
          onBeforePrint={recordBarcodePrintsAction.bind(null, ids)}
          label={`Print ${items.length} Barcode${items.length === 1 ? "" : "s"}`}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items selected.</p>
      ) : (
        <div className="flex max-w-3xl flex-wrap justify-center gap-3">
          {items.map(
            (item) =>
              item.barcode && (
                <BarcodeLabel
                  key={item.id}
                  data={{
                    barcodeCode: formatBarcodeCode(item.barcode.sequence),
                    productName: item.product.name,
                    purity: item.purity,
                    grossWeight: item.grossWeight.toString(),
                    sellingPrice: item.sellingPrice.toString(),
                  }}
                />
              ),
          )}
        </div>
      )}
    </div>
  );
}
