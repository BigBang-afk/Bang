import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listCategories } from "@/services/product-category.service";
import { getEffectiveRatesForDate, getTodayBusinessDate } from "@/services/gold-rate.service";
import { getInventoryItemById, toEditableStockItem } from "@/services/inventory-item.service";
import { StockForm } from "@/components/inventory/stock-form";
import { formatBarcodeCode } from "@/lib/barcode-code";

export const metadata = { title: "Edit Stock | Zarghoon Jewellers" };

export default async function EditStockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.INVENTORY_MANAGE);
  const { id } = await params;

  const [item, categories, rates] = await Promise.all([
    getInventoryItemById(id),
    listCategories(),
    getEffectiveRatesForDate(getTodayBusinessDate()),
  ]);

  if (!item) notFound();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">
          Edit Stock — {item.barcode ? formatBarcodeCode(item.barcode.sequence) : item.product.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Changes to weight, purity, wastage, rate, cost, or price are recorded in stock history.
        </p>
      </div>

      <StockForm
        mode="edit"
        categories={categories}
        todaysRates={rates.map((rate) => ({ purity: rate.purity, ratePerGram: rate.ratePerGram.toString() }))}
        initialItem={toEditableStockItem(item)}
      />
    </div>
  );
}
