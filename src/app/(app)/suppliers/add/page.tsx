import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AddSupplierForm } from "@/components/suppliers/add-supplier-form";

export const metadata = { title: "Add Supplier | Zarghoon Jewellers" };

export default async function AddSupplierPage() {
  await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Add Supplier</h1>
        <p className="text-sm text-muted-foreground">Register a new supplier for purchases and gold tracking.</p>
      </div>
      <AddSupplierForm />
    </div>
  );
}
