import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listCategories } from "@/services/product-category.service";
import { getEffectiveRatesForDate, getTodayBusinessDate } from "@/services/gold-rate.service";
import { StockForm } from "@/components/inventory/stock-form";

export const metadata = { title: "Add Stock | Zarghoon Jewellers" };

export default async function AddStockPage() {
  await requirePermission(PERMISSIONS.INVENTORY_MANAGE);

  const [categories, rates] = await Promise.all([
    listCategories(),
    getEffectiveRatesForDate(getTodayBusinessDate()),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Add New Stock</h1>
        <p className="text-sm text-muted-foreground">
          Enter jewelry details — weight, wastage, and pricing are calculated automatically.
        </p>
      </div>

      <StockForm
        mode="create"
        categories={categories}
        todaysRates={rates.map((rate) => ({ purity: rate.purity, ratePerGram: rate.ratePerGram.toString() }))}
      />
    </div>
  );
}
