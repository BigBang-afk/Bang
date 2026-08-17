import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AddCustomerForm } from "@/components/customers/add-customer-form";

export const metadata = { title: "Add Customer | Zarghoon Jewellers" };

export default async function AddCustomerPage() {
  await requirePermission(PERMISSIONS.CUSTOMERS_CREATE);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Add Customer</h1>
        <p className="text-sm text-muted-foreground">
          Only name and phone are required — everything else can be filled in later.
        </p>
      </div>

      <AddCustomerForm />
    </div>
  );
}
