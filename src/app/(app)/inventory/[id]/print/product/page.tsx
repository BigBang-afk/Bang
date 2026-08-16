import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getInventoryItemById } from "@/services/inventory-item.service";
import { ProductPrintSheet } from "@/components/inventory/product-print-sheet";
import { PrintButton } from "@/components/inventory/print-button";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Print Product | Zarghoon Jewellers" };

export default async function PrintProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);
  const { id } = await params;

  const item = await getInventoryItemById(id);
  if (!item) notFound();

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-4 sm:p-6">
      <div className="flex w-full max-w-xl items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/inventory/${item.id}`}>
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <PrintButton label="Print Product Sheet" />
      </div>

      <ProductPrintSheet item={item} />
    </div>
  );
}
