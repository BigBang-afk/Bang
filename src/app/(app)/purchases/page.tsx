import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listCategories } from "@/services/product-category.service";
import { NewPurchaseForm } from "@/components/purchases/new-purchase-form";

export const metadata = { title: "New Purchase | Zarghoon Jewellers" };

export default async function NewPurchasePage() {
  await requirePermission(PERMISSIONS.PURCHASES_CREATE);
  const categories = await listCategories();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">New Purchase</h1>
        <p className="text-sm text-muted-foreground">
          Record a supplier purchase — weight, gold value, and totals recalculate on save.
        </p>
      </div>
      <NewPurchaseForm categories={categories} />
    </div>
  );
}
